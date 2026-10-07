// Office job commands:
//   bun run job new <alias>             create jobs/<id>/ from the template
//   bun run job extract <id>            split the customer file into work/extract.json and work/entries.txt
//   bun run job build <id> [--no-pdf]   run the pipeline; exit 0 ready, 2 needs review, 3 guard failed, 4 field codes
//   bun run job approve <id> <n>...     record the owner's approval of flagged entries
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildJob } from "../src/build";
import { extract } from "../src/extract";
import { liveFetch } from "../src/verify";

const JOBS = join(import.meta.dir, "..", "jobs");
const [cmd, arg, ...rest] = process.argv.slice(2);

function jobDir(id: string | undefined): string {
  if (!id) throw new Error("job id required");
  const dir = join(JOBS, id);
  if (!existsSync(join(dir, "job.json"))) throw new Error(`no job ${id}`);
  return dir;
}

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

if (cmd === "new") {
  if (!arg || !/^[a-z0-9-]+$/.test(arg)) throw new Error("alias: lowercase letters, digits and dashes only");
  const id = `${stamp()}-${arg}`;
  const dir = join(JOBS, id);
  cpSync(join(JOBS, "_template"), dir, { recursive: true });
  for (const sub of ["input", "work", "out"]) mkdirSync(join(dir, sub), { recursive: true });
  const job = await Bun.file(join(dir, "job.json")).json();
  await Bun.write(join(dir, "job.json"), JSON.stringify({ ...job, id, alias: arg, received_at: new Date().toISOString() }, null, 2) + "\n");
  console.log(id);
} else if (cmd === "extract") {
  const dir = jobDir(arg);
  const inputs = readdirSync(join(dir, "input")).filter((f) => /\.(docx|txt|md)$/i.test(f));
  if (inputs.length !== 1) throw new Error(`expected one .docx/.txt/.md in input/, found ${inputs.length}`);
  const ex = await extract(join(dir, "input", inputs[0]));
  await Bun.write(join(dir, "work", "extract.json"), JSON.stringify(ex, null, 2));
  await Bun.write(join(dir, "work", "entries.txt"), ex.entries.map((e, i) => `${i + 1}. ${e}`).join("\n") + "\n");
  console.log(`entries: ${ex.entries.length}`);
  console.log(`heading: ${ex.heading ?? "(none found: whole file treated as the list)"}`);
  console.log(`body characters: ${ex.body.length}`);
  if (ex.fieldCodes.length) console.log(`FIELD CODES: ${ex.fieldCodes.join(", ")} - ask the customer for a plain-text copy (replies.md #5)`);
} else if (cmd === "build") {
  const r = await buildJob(jobDir(arg), { fetch: liveFetch, pdf: !rest.includes("--no-pdf") });
  console.log(JSON.stringify(r, null, 2));
  process.exit({ ready: 0, "needs-review": 2, "guard-failed": 3, "field-codes": 4 }[r.outcome]);
} else if (cmd === "approve") {
  const dir = jobDir(arg);
  const path = join(dir, "work", "review.json");
  const prev = (await Bun.file(path).exists()) ? await Bun.file(path).json() : { approved: [] };
  const approved = [...new Set([...prev.approved, ...rest.map(Number).filter(Number.isInteger)])].sort((a, b) => a - b);
  await Bun.write(path, JSON.stringify({ approved }, null, 2) + "\n");
  console.log(`approved: ${approved.join(", ")}`);
} else {
  console.log("usage: bun run job new|extract|build|approve ...");
  process.exit(1);
}
