// Checks each parsed item against Crossref and decides its status:
// verified (matched a real record), format-only (formatted but not checked:
// Thai works, and works Crossref does not hold), or needs-review (blocks
// release). Owner decision 2026-10-07: only a concrete doubt or a disagreement
// with a real record is flagged; the customer's report lists every unchecked entry.
import { norm, year } from "./guard";
import type { Checked, ParsedItem } from "./types";

export type Fetch = (url: string) => Promise<{ status: number; json: () => Promise<any> }>;

type Work = {
  title?: string[];
  DOI?: string;
  author?: { family?: string; name?: string }[];
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  "article-number"?: string;
};

const API = "https://api.crossref.org/works";
const UA = { "User-Agent": "ref-office/0.1 (https://github.com/mojisejr/ref-office)" };

const GAP_MS = 300;
let lastCall = 0;

/**
 * Crossref's public pool answers 429 when called too fast. Calls are spaced,
 * and 429 or 5xx is retried with backoff (honouring Retry-After) before giving up.
 */
export const liveFetch: Fetch = async (url) => {
  let res: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await Bun.sleep(wait);
    lastCall = Date.now();
    res = await fetch(url, { headers: UA });
    if (res.status !== 429 && res.status < 500) return res;
    const after = Number(res.headers.get("retry-after"));
    await Bun.sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 1000 * 2 ** attempt);
  }
  return res!;
};

export function titleSim(a: string, b: string): number {
  const A = new Set(norm(a).split(" ").filter(Boolean));
  const B = new Set(norm(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both);
}

function workYear(w: Work): number | null {
  return w.issued?.["date-parts"]?.[0]?.[0] ?? null;
}

function cleanDoi(doi: string): string {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim();
}

const firstPage = (p: string) => p.split(/[-–]/)[0].trim();

/**
 * Reconciles an article with its matched record: fills what the customer left
 * out, corrects the journal name to the published one, and reports volume,
 * issue, or page numbers that disagree instead of overwriting them.
 */
function fill(item: ParsedItem, w: Work, sourced: string[], reasons: string[]): ParsedItem {
  const csl = { ...item.csl };
  const journal = w["container-title"]?.[0];
  if (journal && csl["container-title"] && norm(journal) !== norm(csl["container-title"])) {
    sourced.push(`แก้ชื่อวารสารตามฐานข้อมูล Crossref: "${csl["container-title"]}" เป็น "${journal}"`);
    csl["container-title"] = journal;
  }
  const differs: [string, string | undefined, string | undefined][] = [
    ["ปีที่ (volume)", csl.volume, w.volume],
    ["ฉบับที่ (issue)", csl.issue, w.issue],
    ["เลขหน้า", csl.page && firstPage(csl.page), w.page && firstPage(w.page)],
  ];
  for (const [label, mine, theirs] of differs) {
    if (mine && theirs && mine !== theirs) reasons.push(`${label}ไม่ตรงกับฐานข้อมูล (ลูกค้า ${mine}, ฐานข้อมูล ${theirs})`);
  }
  const set = (key: "container-title" | "volume" | "issue" | "page" | "number" | "DOI", value: string | undefined, label: string) => {
    if (value && !csl[key]) {
      csl[key] = value;
      sourced.push(`เพิ่ม${label}จากฐานข้อมูล Crossref: ${value}`);
    }
  };
  set("DOI", w.DOI, " DOI ");
  set("container-title", w["container-title"]?.[0], "ชื่อวารสาร");
  set("volume", w.volume, "ปีที่ (volume)");
  set("issue", w.issue, "ฉบับที่ (issue)");
  // Journals that number articles put that number in Crossref's page field too; APA prints it as "Article N".
  const articleNo = w["article-number"];
  if (articleNo && !csl.page) set("number", articleNo, "เลขบทความ (article number)");
  else set("page", w.page, "เลขหน้า");
  return { ...item, csl };
}

function matches(item: ParsedItem, w: Work): { ok: boolean; why?: string } {
  const t = w.title?.[0] ?? "";
  if (titleSim(item.csl.title, t) < 0.75) return { ok: false, why: `ชื่อเรื่องในฐานข้อมูลคือ "${t}"` };
  const first = item.csl.author?.[0];
  const fam = first && "family" in first ? norm(first.family) : null;
  const wf = norm(w.author?.[0]?.family ?? w.author?.[0]?.name ?? "");
  if (fam && wf && !wf.includes(fam) && !fam.includes(wf)) return { ok: false, why: `ผู้แต่งคนแรกในฐานข้อมูลคือ ${w.author?.[0]?.family}` };
  return { ok: true };
}

export async function verifyItem(item: ParsedItem, get: Fetch): Promise<Checked> {
  const reasons: string[] = [...(item.uncertain ?? [])];
  const sourced: string[] = [];
  const done = (status: Checked["status"], it: ParsedItem = item): Checked => ({
    ...it,
    status: reasons.length && status !== "needs-review" ? "needs-review" : status,
    reasons,
    sourced,
  });

  if (item.lang === "th") return done("format-only");
  if (item.csl.type === "webpage") return done("format-only");

  if (item.csl.DOI) {
    const doi = cleanDoi(item.csl.DOI);
    const r = await get(`${API}/${encodeURIComponent(doi)}`);
    if (r.status === 404) {
      reasons.push(`DOI ${doi} ไม่มีอยู่จริงในฐานข้อมูล`);
      return done("needs-review");
    }
    if (r.status !== 200) {
      reasons.push(`ตรวจ DOI ไม่สำเร็จ (HTTP ${r.status}) ลองใหม่ภายหลัง`);
      return done("needs-review");
    }
    const w: Work = (await r.json()).message;
    const m = matches(item, w);
    if (!m.ok) {
      reasons.push(`DOI ชี้ไปที่งานอื่น: ${m.why}`);
      return done("needs-review");
    }
    const wy = workYear(w);
    const y = year(item);
    if (wy && y && wy !== y) reasons.push(`ปีไม่ตรงกับฐานข้อมูล (ลูกค้า ${y}, ฐานข้อมูล ${wy})`);
    return done("verified", fill({ ...item, csl: { ...item.csl, DOI: doi } }, w, sourced, reasons));
  }

  // Articles may appear online a year before print; books and chapters come in
  // editions, so their year must match exactly and a search hit only confirms,
  // never fills: a near match could be another edition's DOI.
  const article = item.csl.type === "article-journal";
  const slack = article ? 1 : 0;
  const y = year(item);
  const first = item.csl.author?.[0] ?? item.csl.editor?.[0];
  const params = [`rows=10`, `query.bibliographic=${encodeURIComponent([item.csl.title, item.csl["container-title"] ?? ""].join(" ").trim())}`];
  if (first && "family" in first) params.push(`query.author=${encodeURIComponent(first.family)}`);
  if (y) params.push(`filter=from-pub-date:${y - slack},until-pub-date:${y + slack}`);
  const r = await get(`${API}?${params.join("&")}`);
  if (r.status !== 200) {
    reasons.push(`ค้นฐานข้อมูลไม่สำเร็จ (HTTP ${r.status}) ไม่ได้แปลว่าไม่พบ ให้ build ใหม่ภายหลัง`);
    return done("needs-review");
  }
  {
    const works: Work[] = (await r.json()).message?.items ?? [];
    const hit = works.find((w) => matches(item, w).ok && (!y || !workYear(w) || Math.abs(workYear(w)! - y) <= slack));
    if (hit) {
      const wy = workYear(hit);
      if (wy && y && wy !== y) reasons.push(`ปีไม่ตรงกับฐานข้อมูล (ลูกค้า ${y}, ฐานข้อมูล ${wy})`);
      return done("verified", article ? fill(item, hit, sourced, reasons) : item);
    }
  }
  return done("format-only");
}

export async function verifyAll(items: ParsedItem[], get: Fetch): Promise<Checked[]> {
  const out: Checked[] = [];
  for (const it of items) out.push(await verifyItem(it, get)); // sequential: polite to Crossref
  return out;
}

/**
 * Wraps a fetch with an on-disk JSON cache so rebuilding a job does not query
 * Crossref again. Only answers are cached (200, 404); a failure is retried next build.
 */
export function cachedFetch(get: Fetch, cache: Record<string, { status: number; body: any }>): Fetch {
  return async (url) => {
    const hit = cache[url];
    if (hit) return { status: hit.status, json: async () => hit.body };
    const r = await get(url);
    const body = r.status === 200 ? await r.json() : null;
    if (r.status === 200 || r.status === 404) cache[url] = { status: r.status, body };
    return { status: r.status, json: async () => body };
  };
}
