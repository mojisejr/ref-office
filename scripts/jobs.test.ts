import { expect, test } from "bun:test";
import { report } from "./jobs";

const base = { package: "chapter", revisions_used: 0, purge_after: null };
const now = new Date("2026-10-07T12:00:00+07:00");

test("orders open jobs by deadline and flags due-soon and overdue", () => {
  const out = report(
    [
      { ...base, id: "b", status: "processing", deadline: "2026-10-08T10:00:00+07:00" },
      { ...base, id: "a", status: "needs-review", deadline: "2026-10-07T13:30:00+07:00" },
      { ...base, id: "c", status: "ready", deadline: "2026-10-07T11:00:00+07:00" },
      { ...base, id: "d", status: "closed", deadline: "2026-10-01T10:00:00+07:00" },
    ],
    now,
  );
  expect(out[0]).toBe("Open jobs (3):");
  expect(out[1]).toContain("c  ready");
  expect(out[1]).toContain("OVERDUE by 1.0 h");
  expect(out[2]).toContain("a  needs-review");
  expect(out[2]).toContain("(due soon)");
  expect(out[3]).toContain("b  processing  chapter  22.0 h left");
});

test("lists only closed or delivered jobs past their purge date", () => {
  const out = report(
    [
      { ...base, id: "old", status: "delivered", deadline: null, purge_after: "2026-10-01T00:00:00+07:00" },
      { ...base, id: "fresh", status: "delivered", deadline: null, purge_after: "2026-11-01T00:00:00+07:00" },
    ],
    now,
  );
  expect(out).toEqual(["No open jobs.", "Past purge date, delete with the owner's yes (1):", "  jobs/old"]);
});
