// Matches citations in the body text against the reference list:
// cited but not listed, listed but not cited, and same author with a different year.
import { nameText, norm } from "./guard";
import type { ParsedItem } from "./types";

export type Citation = { name: string; year: string; text: string; sure: boolean };
export type Finding =
  | { kind: "cited-not-listed"; citation: Citation }
  | { kind: "year-mismatch"; citation: Citation; source: number; listedYear: string }
  | { kind: "listed-not-cited"; source: number };

const YEAR = /^(\d{4}[a-z]?|25\d\d[ก-ฮ]?|n\.d\.|ม\.ป\.ป\.)$/;
const PREFIX = /^(e\.g\.,?|see( also)?|cf\.|as cited in|เช่น|ดู|อ้างถึงใน)\s+/i;

/** Year as printed, with the suffix kept: "2021a", "2547", "n.d.", "ม.ป.ป.". */
function listedYear(item: ParsedItem): string {
  const i = item.csl.issued;
  const y = !i ? "n.d." : "literal" in i ? i.literal : String(i["date-parts"][0][0]);
  return `${y}${item.csl["year-suffix"] ?? ""}`;
}

/** First author of a citation's name part: "Hair et al." → "Hair", "ลัลลนา ศิริเจริญ และ สุมาลี นิมานุภาพ" → "ลัลลนา ศิริเจริญ". */
export function firstAuthor(namePart: string): string {
  return namePart
    .replace(/\[[^\]]*\]/g, "")
    .split(/\s+(?:&|and|และคณะ|และ)(?:\s+|$)|\s+et al\.?/)[0]
    .replace(/,$/, "")
    .trim();
}

export function findCitations(body: string): Citation[] {
  const out: Citation[] = [];
  // Parenthetical: (Name, 2010; Name & Name, 2003a, 2003b)
  for (const m of body.matchAll(/\(([^()]{2,400}?)\)/g)) {
    for (const part of m[1].split(";")) {
      const bits = part.trim().replace(PREFIX, "").split(/,\s*/);
      const years: string[] = [];
      while (bits.length > 1 && (YEAR.test(bits[bits.length - 1]) || /^(p|pp|น)\.\s?\S+$/.test(bits[bits.length - 1]))) {
        const b = bits.pop()!;
        if (YEAR.test(b)) years.unshift(b);
      }
      if (!years.length) continue;
      const name = firstAuthor(bits.join(", "));
      if (!name) continue;
      for (const y of years) out.push({ name, year: y, text: `(${part.trim()})`, sure: true });
    }
  }
  // Narrative English: Hair et al. (2010), Greenberg and Baron (2003)
  for (const m of body.matchAll(/([A-Z][\p{L}'’-]+)((?:\s+(?:and|&)\s+[A-Z][\p{L}'’-]+)|\s+et al\.)?\s+\((\d{4}[a-z]?(?:,\s*\d{4}[a-z]?)*|n\.d\.)\)/gu)) {
    for (const y of m[3].split(/,\s*/)) out.push({ name: m[1], year: y, text: m[0], sure: true });
  }
  // Narrative Thai: the two Thai words before "(2547)". Thai has no spaces between
  // words, so the first word may carry text before the name; those are marked unsure.
  for (const m of body.matchAll(/(\p{Script=Thai}+)\s+(\p{Script=Thai}+)(?:\s+และคณะ)?\s*\((25\d\d[ก-ฮ]?|ม\.ป\.ป\.)\)/gu)) {
    out.push({ name: `${m[1]} ${m[2]}`, year: m[3], text: m[0], sure: false });
  }
  return out;
}

function key(s: string): string {
  return norm(s).replace(/\s/g, "");
}

export function crosscheck(body: string, items: ParsedItem[]): Finding[] {
  const listed = items.map((i) => ({
    source: i.source,
    name: key(i.csl.author?.[0] ? nameText(i.csl.author[0]) : i.csl.title),
    year: listedYear(i),
    cited: false,
  }));
  // A citation matches a listed name exactly, or (for unsure Thai narrative) when the listed name ends its captured text.
  const sameName = (c: Citation, l: (typeof listed)[number]) =>
    key(c.name) === l.name || (!c.sure && key(c.name).endsWith(l.name));

  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const c of findCitations(body)) {
    const id = `${key(c.name)}|${c.year}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const byName = listed.filter((l) => sameName(c, l));
    const exact = byName.find((l) => l.year === c.year);
    if (exact) {
      exact.cited = true;
      continue;
    }
    if (byName.length) {
      byName[0].cited = true;
      findings.push({ kind: "year-mismatch", citation: c, source: byName[0].source, listedYear: byName[0].year });
      continue;
    }
    if (c.sure) findings.push({ kind: "cited-not-listed", citation: c });
  }
  // Thai narrative citations with two authors ("ก ข และ ค ง (2540)") put the second
  // author next to the year, so look for each listed Thai name directly before the year.
  const flatBody = key(body);
  for (const [i, l] of listed.entries()) {
    if (l.cited || items[i].lang !== "th") continue;
    const at = flatBody.indexOf(l.name);
    if (at >= 0 && flatBody.slice(at, at + l.name.length + 60).includes(key(l.year))) l.cited = true;
  }
  for (const l of listed) if (!l.cited) findings.push({ kind: "listed-not-cited", source: l.source });
  return findings;
}
