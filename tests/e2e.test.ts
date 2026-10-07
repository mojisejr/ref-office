// End to end on a synthetic chapter: extract → build (flags) → owner approval → package.
import { $ } from "bun";
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildJob } from "../src/build";
import { extract } from "../src/extract";
import type { Fetch } from "../src/verify";
import { english } from "./golden/english";
import { thai } from "./golden/thai";

const root = mkdtempSync(join(tmpdir(), "refoffice-e2e-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const picks = [english[0], english[2], english[7], thai[0], thai[1]];
const chapter = [
  "# บทที่ 2 แนวคิดและทฤษฎี",
  "การเรียนรู้เกิดจากปฏิสัมพันธ์ทางสังคม (Vygotsky, 1978) ส่วนการวิเคราะห์ข้อมูลใช้แนวทางของ Hair et al. (2010)",
  "ตามที่กีรติ บุญเจือ (2547) กล่าวไว้ และงานของ (ลัลลนา ศิริเจริญ และ สุมาลี นิมานุภาพ, 2540) พบว่า นิทานสะท้อนอารมณ์ (Grady et al., 2019)",
  "# บรรณานุกรม",
  ...picks.map((g) => g.raw),
  "# ภาคผนวก ก",
  "แบบสอบถาม",
].join("\n\n");

const gradyWork = { title: [english[7].csl.title], DOI: "10.1037/ppm0000185", author: [{ family: "Grady" }], issued: { "date-parts": [[2019]] } };
const fetchFake: Fetch = async (url) =>
  url.includes("10.1037")
    ? { status: 200, json: async () => ({ message: gradyWork }) }
    : { status: 200, json: async () => ({ message: { items: [] } }) };

async function makeJob(name: string, md: string) {
  const dir = join(root, name);
  for (const d of ["input", "work"]) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, "chapter.md"), md);
  await $`pandoc ${join(dir, "chapter.md")} -o ${join(dir, "input", "chapter.docx")}`.quiet();
  const job = { id: name, alias: name, package: "chapter", style: "apa7", check_in_text: true, institution: null, entries: 5, status: "processing", revisions_used: 0, notes: "" };
  writeFileSync(join(dir, "job.json"), JSON.stringify(job));
  return dir;
}

describe("a chapter goes through the office", async () => {
  const dir = await makeJob("ch2", chapter);
  const ex = await extract(join(dir, "input", "chapter.docx"));
  writeFileSync(join(dir, "work", "extract.json"), JSON.stringify(ex));

  test("extract finds the five entries and stops before the appendix", () => {
    expect(ex.entries).toHaveLength(5);
    expect(ex.heading).toBe("บรรณานุกรม");
    expect(ex.fieldCodes).toEqual([]);
  });

  test("an entry the agent doubts holds the build for the owner; nothing is packaged", async () => {
    writeFileSync(join(dir, "work", "parsed.json"), JSON.stringify({
      items: picks.map((g, i) => ({
        source: i + 1, lang: /\p{Script=Thai}/u.test(g.raw) ? "th" : "en", csl: g.csl,
        ...(i >= 3 ? { uncertain: ["ตรวจการแบ่งชื่อผู้แต่ง"] } : {}),
      })),
    }));
    const r = await buildJob(dir, { fetch: fetchFake, pdf: false });
    expect(r).toEqual({ outcome: "needs-review", flagged: [4, 5] });
    expect(await Bun.file(join(dir, "out", "references.docx")).exists()).toBe(false);
    const flags = await Bun.file(join(dir, "work", "flags.md")).text();
    expect(flags).toContain("รายการที่ 4");
    // Found in dogfood: the owner must see what the entry will become, not only what was written.
    expect(flags).toContain(`จะออกมาเป็น: ${thai[0].expected}`);
  });

  test("after approval the package is built and the cross-check is clean", async () => {
    writeFileSync(join(dir, "work", "review.json"), JSON.stringify({ approved: [4, 5] }));
    const pdf = (await $`docker image inspect ref-office-pdf:1`.nothrow().quiet()).exitCode === 0;
    const r = await buildJob(dir, { fetch: fetchFake, pdf });
    expect(r.outcome).toBe("ready");
    if (r.outcome !== "ready") return;
    expect(r.findings).toEqual([]);
    expect(r.files.map((f) => f.split("/").pop())).toEqual(pdf ? ["references.docx", "report.docx", "references.pdf"] : ["references.docx", "report.docx"]);
    const text = await $`pandoc ${join(dir, "out", "references.docx")} -t plain --wrap=none`.text();
    const lines = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    expect(lines[0]).toBe("บรรณานุกรม");
    expect(lines.slice(1)).toEqual([thai[0].expected, thai[1].expected, english[7].expected, english[2].expected, english[0].expected]);
    const job = await Bun.file(join(dir, "job.json")).json();
    expect(job.status).toBe("ready");
  }, 120_000);

  test("a guard failure leaves no package behind", async () => {
    writeFileSync(join(dir, "work", "parsed.json"), JSON.stringify({ items: [{ source: 1, lang: "en", csl: english[0].csl }] }));
    const r = await buildJob(dir, { fetch: fetchFake, pdf: false });
    expect(r.outcome).toBe("guard-failed");
    expect(await Bun.file(join(dir, "out", "references.docx")).exists()).toBe(false);
  });
});

// Found in dogfood: a Word numbered list and Shift+Enter lines were read as one entry.
test("Word numbered lists and hard line breaks give one entry per line", async () => {
  const md = "Body (Vygotsky, 1978).\n\n# References\n\n1. " + english[0].raw + "\n2. " + english[2].raw + "\n\n" + english[7].raw + "\\\n" + english[1].raw;
  const dir = await makeJob("lists", md);
  const ex = await extract(join(dir, "input", "chapter.docx"));
  expect(ex.entries).toEqual([english[0].raw, english[2].raw, english[7].raw, english[1].raw].map((s) => s.replace(/\s+/g, " ")));
});

test("a file with EndNote field codes is refused before any work", async () => {
  const dir = await makeJob("endnote", "Text (Vygotsky, 1978)\n\n# References\n\n" + english[0].raw);
  const docx = join(dir, "input", "chapter.docx");
  const x = join(dir, "x");
  await $`unzip -q ${docx} -d ${x}`.quiet();
  const docPath = join(x, "word", "document.xml");
  const xml = await Bun.file(docPath).text();
  await Bun.write(docPath, xml.replace("<w:body>", '<w:body><w:p><w:r><w:instrText xml:space="preserve"> ADDIN EN.CITE </w:instrText></w:r></w:p>'));
  await $`cd ${x} && zip -qr ${docx} .`.quiet();
  const ex = await extract(docx);
  expect(ex.fieldCodes).toEqual(["EndNote"]);
  writeFileSync(join(dir, "work", "extract.json"), JSON.stringify(ex));
  writeFileSync(join(dir, "work", "parsed.json"), JSON.stringify({ items: [{ source: 1, lang: "en", csl: english[0].csl }] }));
  expect(await buildJob(dir, { fetch: fetchFake, pdf: false })).toEqual({ outcome: "field-codes", managers: ["EndNote"] });
});
