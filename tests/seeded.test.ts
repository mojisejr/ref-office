// Seeded errors: each test plants one mistake the office must catch.
import { describe, expect, test } from "bun:test";
import { crosscheck } from "../src/crosscheck";
import { splitText } from "../src/extract";
import { guard } from "../src/guard";
import type { ParsedItem } from "../src/types";
import { verifyItem, type Fetch } from "../src/verify";
import { english } from "./golden/english";
import { thai } from "./golden/thai";

const vyg = english[0];
const grady = english[7];
const it = (source: number, g = vyg, lang: "en" | "th" = "en"): ParsedItem => ({ source, lang, csl: structuredClone(g.csl) });

describe("guard: invented, dropped, or altered entries block the build", () => {
  test("an item pointing past the customer's list is invented", () => {
    expect(guard([vyg.raw], { items: [it(1), it(2)] }).map((e) => e.problem)).toContain("item points to no customer entry (invented)");
  });
  test("a customer entry with no item is dropped", () => {
    expect(guard([vyg.raw, grady.raw], { items: [it(1)] })).toEqual([{ source: 2, problem: "customer entry dropped" }]);
  });
  test("one entry used twice", () => {
    expect(guard([vyg.raw], { items: [it(1), it(1)] })).toEqual([{ source: 1, problem: "customer entry used 2 times" }]);
  });
  test("an author not in the entry", () => {
    const x = it(1);
    x.csl.author = [{ family: "Piaget", given: "J." }];
    expect(guard([vyg.raw], { items: [x] })[0].problem).toContain('first author "Piaget"');
  });
  test("a year not in the entry", () => {
    const x = it(1);
    x.csl.issued = { "date-parts": [[1987]] };
    expect(guard([vyg.raw], { items: [x] })[0].problem).toBe("year 1987 is not in the entry");
  });
  test("a title the customer never wrote", () => {
    const x = it(1);
    x.csl.title = "Thought and language in early childhood";
    expect(guard([vyg.raw], { items: [x] })[0].problem).toBe("title words are mostly not in the entry");
  });
  test("a skipped line needs a reason", () => {
    expect(guard(["see appendix"], { items: [], skipped: [{ source: 1, reason: " " }] })).toEqual([{ source: 1, problem: "skipped without a reason" }]);
  });
});

const fake = (routes: Record<string, { status: number; body?: any }>): Fetch => async (url) => {
  const key = Object.keys(routes).find((k) => url.includes(k));
  const r = key ? routes[key] : { status: 404 };
  return { status: r.status, json: async () => r.body };
};
const gradyWork = {
  title: [grady.csl.title], DOI: "10.1037/ppm0000185", author: [{ family: "Grady" }],
  issued: { "date-parts": [[2019]] }, "container-title": ["Psychology of Popular Media Culture"], volume: "8", issue: "3", page: "207-217",
};

describe("verify: entries that do not match a real record are flagged", () => {
  test("a DOI that matches verifies and fills nothing the customer already gave", async () => {
    const c = await verifyItem(it(1, grady), fake({ "10.1037": { status: 200, body: { message: gradyWork } } }));
    expect([c.status, c.sourced]).toEqual(["verified", []]);
  });
  test("a DOI pointing to a different work", async () => {
    const other = { ...gradyWork, title: ["Sleep and memory consolidation in adolescents"] };
    const c = await verifyItem(it(1, grady), fake({ "10.1037": { status: 200, body: { message: other } } }));
    expect(c.status).toBe("needs-review");
    expect(c.reasons[0]).toStartWith("DOI ชี้ไปที่งานอื่น");
  });
  test("a DOI that does not exist", async () => {
    const c = await verifyItem(it(1, grady), fake({}));
    expect([c.status, c.reasons[0]]).toEqual(["needs-review", "DOI 10.1037/ppm0000185 ไม่มีอยู่จริงในฐานข้อมูล"]);
  });
  test("a wrong year against the record", async () => {
    const x = it(1, grady);
    x.csl.issued = { "date-parts": [[2018]] };
    const c = await verifyItem(x, fake({ "10.1037": { status: 200, body: { message: gradyWork } } }));
    expect([c.status, c.reasons[0]]).toEqual(["needs-review", "ปีไม่ตรงกับฐานข้อมูล (ลูกค้า 2018, ฐานข้อมูล 2019)"]);
  });
  test("a journal article found by search gets its missing DOI and pages", async () => {
    const x = it(1, grady);
    delete x.csl.DOI;
    delete x.csl.page;
    const c = await verifyItem(x, fake({ "query.bibliographic": { status: 200, body: { message: { items: [gradyWork] } } } }));
    expect(c.status).toBe("verified");
    expect(c.csl.DOI).toBe("10.1037/ppm0000185");
    expect(c.sourced).toEqual(["เพิ่ม DOI จากฐานข้อมูล Crossref: 10.1037/ppm0000185", "เพิ่มเลขหน้าจากฐานข้อมูล Crossref: 207-217"]);
  });
  test("a journal article nobody can find", async () => {
    const x = it(1, english[8]);
    const c = await verifyItem(x, fake({ "query.bibliographic": { status: 200, body: { message: { items: [] } } } }));
    expect(c.status).toBe("needs-review");
  });
  test("a book found by search is confirmed but gets no DOI from a possible other edition", async () => {
    const book = { title: [vyg.csl.title], DOI: "10.2307/j.ctvjf9vz4", author: [{ family: "Vygotsky" }], issued: { "date-parts": [[1978]] } };
    const c = await verifyItem(it(1), fake({ "query.bibliographic": { status: 200, body: { message: { items: [book] } } } }));
    expect([c.status, c.csl.DOI, c.sourced]).toEqual(["verified", undefined, []]);
  });
  test("a book whose record has another year is not a match", async () => {
    const book = { title: [vyg.csl.title], author: [{ family: "Vygotsky" }], issued: { "date-parts": [[1980]] } };
    const c = await verifyItem(it(1), fake({ "query.bibliographic": { status: 200, body: { message: { items: [book] } } } }));
    expect(c.status).toBe("format-only");
  });
  test("a book with no record is format-only, not blocked", async () => {
    const c = await verifyItem(it(1), fake({ "query.bibliographic": { status: 200, body: { message: { items: [] } } } }));
    expect(c.status).toBe("format-only");
  });
  test("every Thai entry waits for the owner", async () => {
    const c = await verifyItem(it(1, thai[0], "th"), fake({}));
    expect(c.status).toBe("needs-review");
  });
  test("the agent's own doubt blocks even a verified match", async () => {
    const x = { ...it(1, grady), uncertain: ["ชื่อวารสารอ่านไม่ออก"] };
    const c = await verifyItem(x, fake({ "10.1037": { status: 200, body: { message: gradyWork } } }));
    expect([c.status, c.reasons]).toEqual(["needs-review", ["ชื่อวารสารอ่านไม่ออก"]]);
  });
});

describe("cross-check: body and list disagree", () => {
  const items = [it(1, english[0]), it(2, english[2]), it(3, thai[0], "th"), it(4, thai[1], "th")];
  test("a clean chapter has no findings", () => {
    const body = "As Vygotsky (1978) argued, ... (Hair et al., 2010). ตามที่กีรติ บุญเจือ (2547) กล่าวไว้ และ ลัลลนา ศิริเจริญ และ สุมาลี นิมานุภาพ (2540) พบว่า";
    expect(crosscheck(body, items)).toEqual([]);
  });
  test("cited but not listed, wrong year, and listed but not cited", () => {
    const body = "Learning is social (Vygotsky, 1987; Piaget, 1952). ตามที่กีรติ บุญเจือ (2547) กล่าวไว้ (ลัลลนา ศิริเจริญ และ สุมาลี นิมานุภาพ, 2540)";
    const f = crosscheck(body, items);
    expect(f.map((x) => x.kind).sort()).toEqual(["cited-not-listed", "listed-not-cited", "year-mismatch"]);
    expect(f.find((x) => x.kind === "year-mismatch")).toMatchObject({ source: 1, listedYear: "1978" });
    expect(f.find((x) => x.kind === "cited-not-listed")).toMatchObject({ citation: { name: "Piaget", year: "1952" } });
    expect(f.find((x) => x.kind === "listed-not-cited")).toMatchObject({ source: 2 });
  });
  test("Thai parenthetical with และคณะ matches the first author", () => {
    const three = [it(1, thai[2], "th")];
    expect(crosscheck("(ฉัตรตรา บุนนาค และคณะ, 2547)", three)).toEqual([]);
  });
});

describe("extract", () => {
  test("takes the last heading, stops at the appendix, drops typed numbering", () => {
    const text = "สารบัญ\n\nบรรณานุกรม\n\nบทที่ 1 ... (Vygotsky, 1978)\n\nบรรณานุกรม\n\n1. Entry one.\n\n2. Entry two.\n\nภาคผนวก ก\n\nnot a reference";
    const r = splitText(text);
    expect(r.entries).toEqual(["Entry one.", "Entry two."]);
    expect(r.body).toContain("(Vygotsky, 1978)");
  });
  test("no heading: the whole file is the list", () => {
    expect(splitText("A. (2001). One.\n\nB. (2002). Two.")).toEqual({ entries: ["A. (2001). One.", "B. (2002). Two."], body: "", heading: null });
  });
});
