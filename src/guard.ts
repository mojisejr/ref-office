// The release guard. Every customer entry must be accounted for exactly once,
// every output item must come from a customer entry, and the key facts of an
// item must be visible in the entry it claims to come from. A failure here
// stops the build: no file goes out.
import type { Name, Parsed, ParsedItem } from "./types";

export type GuardError = { source: number | null; problem: string };

const TYPES = new Set(["book", "chapter", "article-journal", "thesis", "paper-conference", "webpage", "report"]);

export function norm(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameText(n: Name): string {
  return "literal" in n ? n.literal : n.family;
}

export function year(item: ParsedItem): number | null {
  const i = item.csl.issued;
  return i && "date-parts" in i ? i["date-parts"][0][0] : null;
}

/** Share of the title's words (3+ letters, or any Thai run) that occur in the raw entry. */
export function titleOverlap(title: string, raw: string): number {
  const words = norm(title)
    .split(" ")
    .filter((w) => w.length >= 3 || /\p{Script=Thai}/u.test(w));
  if (!words.length) return 0;
  const r = norm(raw).replace(/\s/g, "");
  return words.filter((w) => r.includes(w.replace(/\s/g, ""))).length / words.length;
}

export function guard(entries: string[], parsed: Parsed): GuardError[] {
  const errors: GuardError[] = [];
  const seen = new Map<number, number>();
  const count = (n: number) => seen.set(n, (seen.get(n) ?? 0) + 1);

  for (const s of parsed.skipped ?? []) {
    count(s.source);
    if (!s.reason?.trim()) errors.push({ source: s.source, problem: "skipped without a reason" });
  }
  for (const item of parsed.items) {
    const n = item.source;
    count(n);
    const raw = entries[n - 1];
    if (raw === undefined) {
      errors.push({ source: n, problem: "item points to no customer entry (invented)" });
      continue;
    }
    const c = item.csl;
    if (!TYPES.has(c.type)) errors.push({ source: n, problem: `unknown type ${c.type}` });
    if (!c.title?.trim()) errors.push({ source: n, problem: "no title" });
    if (!c.issued) errors.push({ source: n, problem: "no year and no ม.ป.ป./n.d. marker" });
    if (item.lang !== "th" && item.lang !== "en") errors.push({ source: n, problem: "lang must be th or en" });

    // Provenance: the facts must be in the customer's own text.
    const rawN = norm(raw).replace(/\s/g, "");
    const first = c.author?.[0] ?? c.editor?.[0];
    if (first && !rawN.includes(norm(nameText(first)).replace(/\s/g, ""))) {
      errors.push({ source: n, problem: `first author "${nameText(first)}" is not in the entry` });
    }
    const y = year(item);
    if (y !== null && !raw.includes(String(y))) {
      errors.push({ source: n, problem: `year ${y} is not in the entry` });
    }
    if (c.title && titleOverlap(c.title, raw) < 0.6) {
      errors.push({ source: n, problem: "title words are mostly not in the entry" });
    }
  }
  entries.forEach((_, i) => {
    const k = seen.get(i + 1) ?? 0;
    if (k === 0) errors.push({ source: i + 1, problem: "customer entry dropped" });
    if (k > 1) errors.push({ source: i + 1, problem: `customer entry used ${k} times` });
  });
  return errors;
}
