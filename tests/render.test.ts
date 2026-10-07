import { describe, expect, test } from "bun:test";
import { guard } from "../src/guard";
import { plain, renderAll, renderEnglish } from "../src/render";
import { renderThai } from "../src/thai";
import type { ParsedItem } from "../src/types";
import { english, sameAuthorYear, type Golden } from "./golden/english";
import { thai } from "./golden/thai";

const item = (g: Golden, i: number, lang: "th" | "en"): ParsedItem => ({ source: i + 1, lang, csl: g.csl });

describe("golden set: English through citeproc", () => {
  test.each(english.map((g, i) => [g.name, g, i] as const))("%s", async (_, g, i) => {
    const [r] = await renderEnglish([item(g, i, "en")]);
    expect(plain(r.md)).toBe(g.expected);
  });
  test("same author and year get a and b by title", async () => {
    const r = await renderEnglish(sameAuthorYear.map((g, i) => item(g, i, "en")));
    expect(r.map((e) => plain(e.md))).toEqual([sameAuthorYear[1].expected, sameAuthorYear[0].expected]);
  });
});

describe("golden set: Thai renderer", () => {
  test.each(thai.map((g, i) => [g.name, g, i] as const))("%s", (_, g, i) => {
    expect(plain(renderThai(item(g, i, "th")))).toBe(g.expected);
  });
  test("Thai entries sort by Thai alphabet and come before English", async () => {
    const items = [...thai.map((g, i) => item(g, i, "th")), ...english.slice(0, 2).map((g, i) => item(g, 100 + i, "en"))];
    const order = (await renderAll(items)).map((r) => plain(r.md).split(".")[0]);
    const thaiNames = order.slice(0, thai.length);
    expect(thaiNames).toEqual([...thaiNames].sort(new Intl.Collator("th").compare));
    expect(order.slice(thai.length)).toEqual(["Greenberg, J", "Vygotsky, L"]);
  });
});

test("every golden raw entry passes the guard against its own parse", () => {
  const all = [...english, ...sameAuthorYear, ...thai];
  const parsed = { items: all.map((g, i) => ({ source: i + 1, lang: /\p{Script=Thai}/u.test(g.raw) ? "th" : "en", csl: g.csl }) as ParsedItem) };
  expect(guard(all.map((g) => g.raw), parsed)).toEqual([]);
});
