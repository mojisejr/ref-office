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

/** Thai alphabetical order on the first author, then year. */
export function sortThai(items: ParsedItem[]): ParsedItem[] {
  const key = (i: ParsedItem) => (i.csl.author?.[0] ? nameText(i.csl.author[0]) : i.csl.title);
  return [...items].sort((a, b) => collator.compare(key(a), key(b)) || when(a.csl).localeCompare(when(b.csl)));
}
