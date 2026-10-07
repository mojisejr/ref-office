// Checks each parsed item against Crossref and decides its status:
// verified (matched a real record), format-only (a kind Crossref does not
// cover, formatted but not checked), or needs-review (blocks release).
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
};

const API = "https://api.crossref.org/works";
const UA = { "User-Agent": "ref-office/0.1 (https://github.com/mojisejr/ref-office)" };

export const liveFetch: Fetch = (url) => fetch(url, { headers: UA });

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

/** Fills fields the customer left out from the matched record; never overwrites what they gave. */
function fill(item: ParsedItem, w: Work, sourced: string[]): ParsedItem {
  const csl = { ...item.csl };
  const set = (key: "container-title" | "volume" | "issue" | "page" | "DOI", value: string | undefined, label: string) => {
    if (value && !csl[key]) {
      csl[key] = value;
      sourced.push(`เพิ่ม${label}จากฐานข้อมูล Crossref: ${value}`);
    }
  };
  set("DOI", w.DOI, " DOI ");
  set("container-title", w["container-title"]?.[0], "ชื่อวารสาร");
  set("volume", w.volume, "ปีที่ (volume)");
  set("issue", w.issue, "ฉบับที่ (issue)");
  set("page", w.page, "เลขหน้า");
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

  if (item.lang === "th") {
    reasons.push("รายการภาษาไทย: ยังตรวจกับฐานข้อมูลอัตโนมัติไม่ได้ ให้เจ้าของดู");
    return done("needs-review");
  }
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
    return done("verified", fill({ ...item, csl: { ...item.csl, DOI: doi } }, w, sourced));
  }

  const first = item.csl.author?.[0];
  const q = [item.csl.title, first && "family" in first ? first.family : "", year(item) ?? ""].join(" ");
  const r = await get(`${API}?rows=5&query.bibliographic=${encodeURIComponent(q)}`);
  if (r.status === 200) {
    const works: Work[] = (await r.json()).message?.items ?? [];
    const y = year(item);
    // Articles may appear online a year before print; books and chapters come in
    // editions, so their year must match exactly and a search hit only confirms,
    // never fills: a near match could be another edition's DOI.
    const article = item.csl.type === "article-journal";
    const slack = article ? 1 : 0;
    const hit = works.find((w) => matches(item, w).ok && (!y || !workYear(w) || Math.abs(workYear(w)! - y) <= slack));
    if (hit) {
      const wy = workYear(hit);
      if (wy && y && wy !== y) reasons.push(`ปีไม่ตรงกับฐานข้อมูล (ลูกค้า ${y}, ฐานข้อมูล ${wy})`);
      return done("verified", article ? fill(item, hit, sourced) : item);
    }
  }
  if (item.csl.type === "article-journal") {
    reasons.push("ไม่พบบทความนี้ในฐานข้อมูล ตรวจชื่อเรื่อง ชื่อวารสาร และปี");
    return done("needs-review");
  }
  return done("format-only");
}

export async function verifyAll(items: ParsedItem[], get: Fetch): Promise<Checked[]> {
  const out: Checked[] = [];
  for (const it of items) out.push(await verifyItem(it, get)); // sequential: polite to Crossref
  return out;
}

/** Wraps a fetch with an on-disk JSON cache so rebuilding a job does not query Crossref again. */
export function cachedFetch(get: Fetch, cache: Record<string, { status: number; body: any }>): Fetch {
  return async (url) => {
    if (!cache[url]) {
      const r = await get(url);
      cache[url] = { status: r.status, body: r.status === 200 ? await r.json() : null };
    }
    const hit = cache[url];
    return { status: hit.status, json: async () => hit.body };
  };
}
