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

export async function fileToText(path: string): Promise<string> {
  if (path.toLowerCase().endsWith(".docx")) {
    return await $`pandoc ${path} -t plain --wrap=none`.text();
  }
  return await Bun.file(path).text();
}

export async function detectFieldCodes(path: string): Promise<string[]> {
  if (!path.toLowerCase().endsWith(".docx")) return [];
  const xml = await $`unzip -p ${path} word/document.xml`.nothrow().quiet().text();
  return FIELD_CODES.filter(([re]) => re.test(xml)).map(([, name]) => name);
}

export function splitText(text: string): Omit<Extract, "fieldCodes"> {
  const paras = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
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

/** Drops list numbering a customer typed by hand ("1." "[3]"), nothing else. */
function clean(entry: string): string {
  return entry.replace(/^(\[\d+\]|\d+[.)])\s+/, "").replace(/\s+/g, " ").trim();
}

export async function extract(path: string): Promise<Extract> {
  const [text, fieldCodes] = await Promise.all([fileToText(path), detectFieldCodes(path)]);
  return { ...splitText(text), fieldCodes };
}
