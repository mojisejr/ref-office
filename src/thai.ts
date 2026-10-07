// Renders Thai-language entries as Markdown following the Thai APA 7 rules in
// knowledge/thai-rules.md: names as written, Buddhist-era years, "และ", Thai terms.
import { nameText } from "./guard";
import type { Csl, Name, ParsedItem } from "./types";

const collator = new Intl.Collator("th");

function names(list: Name[]): string {
  const n = list.map(nameText);
  if (n.length === 1) return n[0];
  if (n.length <= 20) return `${n.slice(0, -1).join(", ")}, และ ${n[n.length - 1]}`;
  return `${n.slice(0, 19).join(", ")}, . . . ${n[n.length - 1]}`;
}

function editors(list: Name[]): string {
  const n = list.map(nameText);
  return n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} และ ${n[n.length - 1]}`;
}

function when(c: Csl): string {
  if (!c.issued) return "ม.ป.ป.";
  if ("literal" in c.issued) return c.issued.literal;
  return `${c.issued["date-parts"][0][0]}${c["year-suffix"] ?? ""}`;
}

const md = (s: string) => s.replace(/([*_\\[\]])/g, "\\$1");
const end = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);
const pages = (p: string) => p.replace(/\s*[-–]\s*/, "-");

export function renderThai(item: ParsedItem): string {
  const c = item.csl;
  const who = c.author?.length ? names(c.author) : null;
  const head = who ? `${end(md(who))} (${when(c)}).` : null;
  const ed = c.edition && c.edition !== "1" ? ` (พิมพ์ครั้งที่ ${c.edition})` : "";
  const link = c.DOI ? ` <https://doi.org/${c.DOI}>` : c.URL ? ` <${c.URL}>` : "";
  // APA 7 leaves the publisher out when it is the author.
  const pubIsAuthor = !!c.publisher && c.author?.length === 1 && nameText(c.author[0]) === c.publisher;
  const pub = c.publisher && !pubIsAuthor ? ` ${end(md(c.publisher))}` : "";
  let body: string;
  switch (c.type) {
    case "chapter":
    case "paper-conference": {
      const by = c.editor?.length ? `${md(editors(c.editor))} (บก.), ` : "";
      const pp = c.page ? ` (น. ${pages(c.page)})` : "";
      body = `${end(md(c.title))} ใน ${by}*${md(c["container-title"] ?? "")}*${pp}.${pub}`;
      break;
    }
    case "article-journal": {
      const vol = c.volume ? `, ${md(c.volume)}` : "";
      const iss = c.issue ? `(${md(c.issue)})` : "";
      const pp = c.page ? `, ${pages(c.page)}` : "";
      body = `${end(md(c.title))} *${md(c["container-title"] ?? "")}${vol}*${iss}${pp}.`;
      break;
    }
    case "thesis": {
      const kind = [c.genre, c.publisher].filter(Boolean).map((s) => md(s!)).join(", ");
      const arch = c.archive ? ` ${end(md(c.archive))}` : "";
      body = `*${md(c.title)}*${kind ? ` [${kind}]` : ""}.${arch}`;
      return `${head ?? ""} ${body}${link}`.trim();
    }
    case "speech": {
      const kind = c.genre ? ` [${md(c.genre)}]` : "";
      const where = [c["event-title"], c["event-place"]].filter(Boolean).map((s) => md(s!)).join(", ");
      body = `*${md(c.title)}*${kind}.${where ? ` ${end(where)}` : ""}`;
      break;
    }
    case "webpage": {
      const site = c["container-title"] ? ` ${end(md(c["container-title"]))}` : "";
      body = `*${md(c.title)}*.${site}`;
      break;
    }
    default:
      body = `*${md(c.title)}*${ed}.${pub}`;
  }
  // No author: APA moves the title into the author position.
  if (!head) return `${body.replace(/\.$/, "")} (${when(c)}).${link}`.trim();
  return `${head} ${body}${link}`.trim();
}

const authorsKey = (i: ParsedItem) => (i.csl.author?.length ? i.csl.author.map(nameText).join("|") : i.csl.title);

/**
 * Thai alphabetical order on the authors, then year, then title. Works by the
 * same authors in the same year get ก, ข, ... after the year, in title order,
 * as English entries get a, b.
 */
export function sortThai(items: ParsedItem[]): ParsedItem[] {
  const sorted = [...items].sort(
    (a, b) => collator.compare(authorsKey(a), authorsKey(b)) || when(a.csl).localeCompare(when(b.csl)) || collator.compare(a.csl.title, b.csl.title),
  );
  const groups = new Map<string, ParsedItem[]>();
  for (const i of sorted) {
    const k = `${authorsKey(i)}#${when(i.csl)}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const letters = "กขคงจฉชซฌญ";
  return sorted.map((i) => {
    const g = groups.get(`${authorsKey(i)}#${when(i.csl)}`)!;
    if (g.length < 2 || i.csl["year-suffix"]) return i;
    return { ...i, csl: { ...i.csl, "year-suffix": letters[g.indexOf(i)] } };
  });
}
