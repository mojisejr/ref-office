// Turns checked items into the reference list: English entries through
// pandoc citeproc with apa.csl, Thai entries through renderThai, then one
// .docx whose "Bibliography" style carries the APA page rules.
import { $ } from "bun";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderThai, sortThai } from "./thai";
import type { ParsedItem } from "./types";

const ROOT = join(import.meta.dir, "..");
export const APA_CSL = join(ROOT, "styles", "apa.csl");

export type Rendered = { source: number; md: string };

export const FONTS = {
  "th-sarabun-16": { face: "TH Sarabun New", halfPoints: 32 },
  "times-12": { face: "Times New Roman", halfPoints: 24 },
} as const;

/** citeproc prints "n.d." itself when there is no date; a literal n.d. would print twice. */
function forCiteproc(csl: ParsedItem["csl"]): ParsedItem["csl"] {
  const i = csl.issued;
  if (i && "literal" in i && /^(n\.d\.|ม\.ป\.ป\.)$/.test(i.literal.trim())) {
    const { issued, ...rest } = csl;
    return rest as ParsedItem["csl"];
  }
  return csl;
}

export async function renderEnglish(items: ParsedItem[]): Promise<Rendered[]> {
  if (!items.length) return [];
  const dir = mkdtempSync(join(tmpdir(), "refoffice-"));
  try {
    const bib = join(dir, "items.json");
    const doc = join(dir, "doc.md");
    writeFileSync(bib, JSON.stringify(items.map((i) => ({ ...forCiteproc(i.csl), id: `s${i.source}` }))));
    writeFileSync(doc, '---\nnocite: "@*"\n---\n');
    const out = await $`pandoc ${doc} --citeproc --csl ${APA_CSL} --bibliography ${bib} -t markdown-citations --wrap=none`.text();
    const found: Rendered[] = [];
    for (const m of out.matchAll(/::: \{#ref-s(\d+) \.csl-entry\}\n([\s\S]*?)\n:::/g)) {
      // APA 7 and the Thai guides print the author ellipsis as spaced points.
      // apa.csl writes "Retrieved <url>" for an undated page when no access date is given; the
      // Thai guides print the URL alone, so the dangling word goes.
      const md = m[2].trim().replace(/, (?:\.\.\.|…) /, ", . . . ").replace(/ Retrieved (<https?:)/, " $1");
      found.push({ source: Number(m[1]), md });
    }
    if (found.length !== items.length) throw new Error(`citeproc rendered ${found.length} of ${items.length} entries`);
    return found;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function renderAll(items: ParsedItem[], order: "thai-first" | "english-first" = "thai-first"): Promise<Rendered[]> {
  const th = sortThai(items.filter((i) => i.lang === "th")).map((i) => ({ source: i.source, md: renderThai(i) }));
  const en = await renderEnglish(items.filter((i) => i.lang === "en"));
  return order === "thai-first" ? [...th, ...en] : [...en, ...th];
}

/** Markdown entry to plain text, for the change report. */
export function plain(md: string): string {
  const urls: string[] = [];
  return md
    .replace(/<(https?:[^>]+)>/g, (_, u) => `\u0001${urls.push(u) - 1}\u0001`)
    .replace(/\\([*_\[\]\\])/g, "\u0000$1")
    .replace(/[*_]/g, "")
    .replace(/\u0000/g, "")
    .replace(/--/g, "–")
    .replace(/\u0001(\d+)\u0001/g, (_, n) => urls[Number(n)])
    .trim();
}

export function listMarkdown(heading: string, entries: Rendered[]): string {
  const body = entries.map((e) => e.md).join("\n\n");
  return `::: {custom-style="RefHeading"}\n${heading}\n:::\n\n::: {custom-style="Bibliography"}\n${body}\n:::\n`;
}

/** Pandoc's default reference.docx with APA list styles and the chosen font. */
export async function makeReferenceDocx(font: keyof typeof FONTS, outPath: string): Promise<void> {
  const { face, halfPoints } = FONTS[font];
  const dir = mkdtempSync(join(tmpdir(), "refdocx-"));
  try {
    const base = join(dir, "base.docx");
    await $`pandoc -o ${base} --print-default-data-file reference.docx`.quiet();
    const x = join(dir, "x");
    await $`unzip -q ${base} -d ${x}`.quiet();
    const stylesPath = join(x, "word", "styles.xml");
    let s = await Bun.file(stylesPath).text();
    const rFonts = `<w:rFonts w:ascii="${face}" w:hAnsi="${face}" w:eastAsia="${face}" w:cs="${face}" />`;
    s = s.replace(/<w:rFonts [^>]*\/>(\s*<w:sz w:val="24" \/>\s*<w:szCs w:val="24" \/>)/, `${rFonts}$1`);
    s = s.replace(/(<w:rPrDefault>[\s\S]*?)<w:sz w:val="24" \/>\s*<w:szCs w:val="24" \/>/, `$1<w:sz w:val="${halfPoints}" /><w:szCs w:val="${halfPoints}" />`);
    s = s.replace(/<w:lang w:val="en-US" w:eastAsia="zh-CN" w:bidi="ar-SA" \/>/, '<w:lang w:val="en-US" w:eastAsia="th-TH" w:bidi="th-TH" />');
    const listPPr = '<w:pPr><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto" /><w:ind w:left="720" w:hanging="720" /></w:pPr>';
    s = s.replace(
      /(<w:style w:type="paragraph" w:styleId="Bibliography">[\s\S]*?)<w:pPr \/>/,
      `$1${listPPr}`,
    );
    const heading =
      '<w:style w:type="paragraph" w:customStyle="1" w:styleId="RefHeading"><w:name w:val="RefHeading" /><w:basedOn w:val="Normal" /><w:next w:val="Bibliography" /><w:qFormat />' +
      '<w:pPr><w:keepNext /><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto" /><w:jc w:val="center" /></w:pPr><w:rPr><w:b /><w:bCs /></w:rPr></w:style>';
    s = s.replace("</w:styles>", `${heading}</w:styles>`);
    if (!s.includes(`w:ascii="${face}"`) || !s.includes('w:hanging="720"')) throw new Error("reference.docx styles were not patched");
    await Bun.write(stylesPath, s);
    await $`cd ${x} && zip -qX -r ${outPath} '[Content_Types].xml' _rels docProps word`.quiet();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function writeDocx(markdown: string, refDocx: string, outPath: string): Promise<void> {
  await $`pandoc -f markdown -o ${outPath} --reference-doc ${refDocx} < ${Buffer.from(markdown)}`.quiet();
}
