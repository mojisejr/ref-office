// One job, end to end: guard → verify → (owner review gate) → render → docx/pdf
// → in-text cross-check → change report. Nothing reaches out/ unless every
// step passes and every flag has an owner decision.
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { crosscheck, type Finding } from "./crosscheck";
import { guard } from "./guard";
import { toPdf } from "./pdf";
import { listMarkdown, makeReferenceDocx, renderAll, writeDocx } from "./render";
import { customerReport, ownerFlags } from "./report";
import type { Checked, Extract, Job, Parsed } from "./types";
import { cachedFetch, verifyAll, type Fetch } from "./verify";

export type BuildResult =
  | { outcome: "guard-failed"; problems: string[] }
  | { outcome: "field-codes"; managers: string[] }
  | { outcome: "needs-review"; flagged: number[] }
  | { outcome: "ready"; files: string[]; findings: Finding[] | null; seconds: number };

const read = async <T>(p: string): Promise<T | null> => ((await Bun.file(p).exists()) ? Bun.file(p).json() : null);

export async function buildJob(dir: string, opts: { fetch: Fetch; pdf: boolean }): Promise<BuildResult> {
  const started = performance.now();
  const work = join(dir, "work");
  const out = join(dir, "out");
  const job = (await read<Job>(join(dir, "job.json")))!;
  const ex = await read<Extract>(join(work, "extract.json"));
  const parsed = await read<Parsed>(join(work, "parsed.json"));
  if (!ex) throw new Error("work/extract.json missing: run `bun run job extract <id>` first");
  if (!parsed) throw new Error("work/parsed.json missing: the agent writes it from work/entries.txt");
  const approved = new Set((await read<{ approved: number[] }>(join(work, "review.json")))?.approved ?? []);
  const setStatus = async (status: string) => Bun.write(join(dir, "job.json"), JSON.stringify({ ...job, status }, null, 2) + "\n");

  rmSync(out, { recursive: true, force: true }); // a failed build must not leave an older package behind

  if (ex.fieldCodes.length) return { outcome: "field-codes", managers: ex.fieldCodes };

  const problems = guard(ex.entries, parsed).map((e) => `entry ${e.source ?? "?"}: ${e.problem}`);
  if (problems.length) {
    await Bun.write(join(work, "guard-errors.txt"), problems.join("\n") + "\n");
    return { outcome: "guard-failed", problems };
  }

  const cachePath = join(work, "crossref-cache.json");
  const cache = (await read<Record<string, any>>(cachePath)) ?? {};
  const checked: Checked[] = (await verifyAll(parsed.items, cachedFetch(opts.fetch, cache))).map((c) =>
    c.status === "needs-review" && approved.has(c.source) ? { ...c, status: "format-only" } : c,
  );
  await Bun.write(cachePath, JSON.stringify(cache));
  await Bun.write(join(work, "checked.json"), JSON.stringify(checked, null, 2));

  const rendered = await renderAll(checked, job.order ?? "thai-first");
  const flagged = checked.filter((c) => c.status === "needs-review").map((c) => c.source);
  if (flagged.length) {
    await Bun.write(join(work, "flags.md"), ownerFlags(checked, ex.entries, rendered));
    await setStatus("needs-review");
    return { outcome: "needs-review", flagged };
  }

  const heading = ex.heading ?? (checked.some((c) => c.lang === "th") ? "บรรณานุกรม" : "References");
  const findings = job.check_in_text ? crosscheck(ex.body, checked) : null;

  mkdirSync(out, { recursive: true });
  const refDocx = join(work, "reference.docx");
  await makeReferenceDocx(job.font ?? "th-sarabun-16", refDocx);
  const files = [join(out, "references.docx"), join(out, "report.docx")];
  await writeDocx(listMarkdown(heading, rendered), refDocx, files[0]);
  await writeDocx(customerReport({ entries: ex.entries, checked, rendered, findings }), refDocx, files[1]);
  if (opts.pdf) files.push(await toPdf(files[0]));
  await setStatus("ready");
  return { outcome: "ready", files, findings, seconds: (performance.now() - started) / 1000 };
}
