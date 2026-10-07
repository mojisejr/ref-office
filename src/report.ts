// Writes the two human documents: the customer's change report (Thai) and the
// owner's review list of entries the checker will not release on its own.
import type { Finding } from "./crosscheck";
import { plain, type Rendered } from "./render";
import type { Checked } from "./types";

const sameText = (a: string, b: string) => a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

export function customerReport(opts: {
  entries: string[];
  checked: Checked[];
  rendered: Rendered[];
  findings: Finding[] | null;
}): string {
  const { entries, checked, rendered, findings } = opts;
  const after = new Map(rendered.map((r) => [r.source, plain(r.md)]));
  const afterMd = new Map(rendered.map((r) => [r.source, r.md]));
  const changed = checked.filter((c) => !sameText(entries[c.source - 1], after.get(c.source) ?? ""));
  const unverified = checked.filter((c) => c.status === "format-only");
  const out: string[] = ["# รายงานการแก้บรรณานุกรม", ""];

  out.push("## สรุป", "");
  out.push(`- จัดรูปแบบตาม APA 7 ทั้งหมด ${checked.length} รายการ`);
  out.push(`- แก้ไข ${changed.length} รายการ`);
  out.push(`- ตรวจกับฐานข้อมูลบทความแล้ว ${checked.filter((c) => c.status === "verified").length} รายการ`);
  if (findings) out.push(`- ตรวจอ้างอิงในเนื้อหาพบจุดที่ไม่ตรงกัน ${findings.length} จุด`);
  out.push("");

  if (changed.length) {
    out.push("## รายการที่แก้", "");
    for (const c of changed) {
      out.push(`### รายการที่ ${c.source}`, "");
      out.push(`**เดิม:** ${escape(entries[c.source - 1])}`, "");
      out.push(`**ใหม่:** ${afterMd.get(c.source) ?? ""}`, "");
      const why = [...(c.fixes ?? []), ...c.sourced];
      if (why.length) out.push(...why.map((w) => `- ${escape(w)}`), "");
    }
  }

  if (findings) {
    out.push("## ผลตรวจอ้างอิงในเนื้อหา", "");
    if (!findings.length) out.push("อ้างอิงในเนื้อหาตรงกับบรรณานุกรมทุกรายการ", "");
    for (const f of findings) {
      if (f.kind === "cited-not-listed") out.push(`- อ้างถึงในเนื้อหาแต่ไม่มีในบรรณานุกรม: ${escape(f.citation.text)}`);
      if (f.kind === "year-mismatch")
        out.push(`- ปีไม่ตรงกัน: ในเนื้อหาเขียน ${escape(f.citation.text)} แต่บรรณานุกรมรายการที่ ${f.source} เป็นปี ${f.listedYear}`);
      if (f.kind === "listed-not-cited") out.push(`- มีในบรรณานุกรมแต่ไม่พบการอ้างถึงในเนื้อหา: รายการที่ ${f.source}`);
    }
    out.push("", "ร้านไม่ได้แก้เนื้อหาหรือลบรายการให้ กรุณาตรวจและแก้ในเนื้อหาของคุณ", "");
  }

  if (unverified.length) {
    out.push("## รายการที่ไม่ได้ตรวจกับฐานข้อมูล", "");
    out.push("รายการเหล่านี้จัดรูปแบบแล้ว แต่ไม่มีในฐานข้อมูลบทความ (ปกติสำหรับรายการภาษาไทย หนังสือ วิทยานิพนธ์ เว็บไซต์ และวารสารที่ไม่มี DOI) กรุณาตรวจข้อมูลกับต้นฉบับอีกครั้ง:", "");
    out.push(...unverified.map((c) => `- รายการที่ ${c.source}`), "");
  }
  return out.join("\n");
}

export function ownerFlags(checked: Checked[], entries: string[], rendered: Rendered[]): string {
  const after = new Map(rendered.map((r) => [r.source, plain(r.md)]));
  const flagged = checked.filter((c) => c.status === "needs-review");
  const out = [`# รายการรอเจ้าของดู (${flagged.length})`, ""];
  for (const c of flagged) {
    out.push(`## รายการที่ ${c.source}`, "", `ลูกค้าเขียน: ${entries[c.source - 1]}`, "", `จะออกมาเป็น: ${after.get(c.source) ?? ""}`, "");
    out.push(...[...c.reasons, ...c.sourced].map((r) => `- ${r}`), "");
  }
  out.push("อนุมัติ: บอก agent ว่า `อนุมัติ <เลขรายการ>` หรือบอกสิ่งที่ต้องแก้");
  return out.join("\n");
}

function escape(s: string): string {
  return s.replace(/([*_\\[\]<>#])/g, "\\$1");
}
