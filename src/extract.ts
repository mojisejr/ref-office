// Splits a customer file into body text and reference entries, and detects
// reference-manager field codes that would overwrite our edits.
import { $ } from "bun";
import type { Extract } from "./types";

const HEADING = /^(references|reference list|bibliography|works cited|บรรณานุกรม|เอกสารอ้างอิง|รายการอ้างอิง)\s*:?\s*$/i;
// \b does not work after Thai letters in JavaScript, so Thai words are matched as prefixes.
const AFTER_LIST = /^(?:(?:appendix|appendices|biography|vita)\b|ภาคผนวก|ประวัติผู้เขียน|ประวัติผู้วิจัย)/i;

const FIELD_CODES: [RegExp, string][] = [
  [/ADDIN EN\.CITE/, "EndNote"],
  [/ADDIN ZOTERO_/, "Zotero"],
  [/ADDIN CSL_CITATION/, "Mendeley/CSL"],
];

type Node = { t: string; c?: any };

/** Plain text of pandoc inlines. Footnotes are left out: they are not part of the entry. */
function inlineText(inlines: Node[]): string {
  let s = "";
  for (const n of inlines) {
    switch (n.t) {
      case "Str": s += n.c; break;
      case "Space": case "SoftBreak": s += " "; break;
      case "LineBreak": s += "\n"; break;
      case "Code": case "Math": s += n.c[1]; break;
      case "Quoted": s += (n.c[0].t === "SingleQuote" ? "'" : '"') + inlineText(n.c[1]) + (n.c[0].t === "SingleQuote" ? "'" : '"'); break;
      case "Emph": case "Strong": case "Underline": case "Strikeout": case "Superscript": case "Subscript": case "SmallCaps": s += inlineText(n.c); break;
      case "Span": case "Link": case "Image": s += inlineText(n.c[1]); break;
      case "Cite": s += inlineText(n.c[1]); break;
      default: break; // Note, RawInline
    }
  }
  return s;
}

/**
 * Paragraphs of a docx in reading order. Each list item and each hard line
 * break (Shift+Enter) starts a new paragraph, since students lay out a
 * reference list either way; Word's own list numbers are not in the text.
 */
function blockParagraphs(blocks: Node[], out: string[]): void {
  for (const b of blocks) {
    switch (b.t) {
      case "Para": case "Plain": out.push(...inlineText(b.c).split("\n")); break;
      case "Header": out.push(inlineText(b.c[2])); break;
      case "OrderedList": for (const item of b.c[1]) blockParagraphs(item, out); break;
      case "BulletList": for (const item of b.c) blockParagraphs(item, out); break;
      case "BlockQuote": blockParagraphs(b.c, out); break;
      case "Div": blockParagraphs(b.c[1], out); break;
      case "LineBlock": for (const line of b.c) out.push(inlineText(line)); break;
      case "Table": break; // tables in a chapter are data, not references
      default: break;
    }
  }
}

export async function docxParagraphs(path: string): Promise<string[]> {
  const ast = JSON.parse(await $`pandoc ${path} -t json`.text());
  const out: string[] = [];
  blockParagraphs(ast.blocks, out);
  return out;
}

export async function detectFieldCodes(path: string): Promise<string[]> {
  if (!path.toLowerCase().endsWith(".docx")) return [];
  const xml = await $`unzip -p ${path} word/document.xml`.nothrow().quiet().text();
  return FIELD_CODES.filter(([re]) => re.test(xml)).map(([, name]) => name);
}

/** Text files: paragraphs are separated by a blank line, as typed. */
export function textParagraphs(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
}

export function splitParagraphs(raw: string[]): Omit<Extract, "fieldCodes"> {
  const paras = raw.map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  // The last matching heading wins: a table of contents may name the list earlier.
  let at = -1;
  paras.forEach((p, i) => {
    if (HEADING.test(p)) at = i;
  });
  if (at < 0) return { entries: paras.map(clean), body: "", heading: null };
  const rest = paras.slice(at + 1);
  const end = rest.findIndex((p) => AFTER_LIST.test(p));
  return {
    entries: (end < 0 ? rest : rest.slice(0, end)).map(clean),
    body: paras.slice(0, at).join("\n\n"),
    heading: paras[at],
  };
}

export function splitText(text: string): Omit<Extract, "fieldCodes"> {
  return splitParagraphs(textParagraphs(text));
}

/** Drops list numbering a customer typed by hand ("1." "[3]"), nothing else. */
function clean(entry: string): string {
  return entry.replace(/^(\[\d+\]|\d+[.)])\s+/, "").replace(/\s+/g, " ").trim();
}

export async function extract(path: string): Promise<Extract> {
  const isDocx = path.toLowerCase().endsWith(".docx");
  const [paras, fieldCodes] = await Promise.all([
    isDocx ? docxParagraphs(path) : Bun.file(path).text().then(textParagraphs),
    detectFieldCodes(path),
  ]);
  return { ...splitParagraphs(paras), fieldCodes };
}
