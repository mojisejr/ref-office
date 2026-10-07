// Lists open jobs nearest deadline first, and delivered jobs past their purge date.
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Job = {
  id: string;
  package: string;
  status: string;
  deadline: string | null;
  purge_after: string | null;
  revisions_used: number;
};

const OPEN = new Set(["quoted", "processing", "needs-review", "ready", "revision"]);

export function loadJobs(dir: string): Job[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => join(dir, d.name, "job.json"))
    .filter((p) => existsSync(p))
    .map((p) => JSON.parse(readFileSync(p, "utf8")) as Job);
}

export function report(jobs: Job[], now: Date): string[] {
  const lines: string[] = [];
  const open = jobs
    .filter((j) => OPEN.has(j.status))
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  lines.push(open.length ? `Open jobs (${open.length}):` : "No open jobs.");
  for (const j of open) {
    let when = "no deadline yet";
    if (j.deadline) {
      const hours = (Date.parse(j.deadline) - now.getTime()) / 3_600_000;
      when = hours < 0 ? `OVERDUE by ${(-hours).toFixed(1)} h` : `${hours.toFixed(1)} h left`;
      if (hours >= 0 && hours < 3) when += " (due soon)";
    }
    lines.push(`  ${j.id}  ${j.status}  ${j.package}  ${when}`);
  }
  const purge = jobs.filter(
    (j) => j.purge_after && Date.parse(j.purge_after) <= now.getTime() && !OPEN.has(j.status),
  );
  if (purge.length) {
    lines.push(`Past purge date, delete with the owner's yes (${purge.length}):`);
    for (const j of purge) lines.push(`  jobs/${j.id}`);
  }
  return lines;
}

if (import.meta.main) {
  console.log(report(loadJobs(join(import.meta.dir, "..", "jobs")), new Date()).join("\n"));
}
