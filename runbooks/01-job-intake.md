# 01 · Job intake and lifecycle (agent)

## Job folder

Every order is one folder under `jobs/`, named by its id:
`YYYYMMDD-HHMM-<alias>`, where alias is a short nickname the owner gives, never
the customer's real name. Copy `jobs/_template/` to start one.

```
jobs/<id>/
  job.json    state and deadline (shape below)
  input/      files exactly as the customer sent them, never edited
  work/       intermediate files
  out/        what the owner uploads: .docx, .pdf, change report
```

`job.json` fields:

| Field | Meaning |
|---|---|
| `id`, `alias` | as above |
| `package` | `start` (≤12 entries) · `chapter` (≤25, +20 ฿ each over) · `express` (≤25, +35 ฿ each over, 3 h, 09–21) |
| `style` | `apa7` (`apa6` only if the customer insists and the owner agrees) |
| `check_in_text` | `true` for chapter and express |
| `institution` | guide the customer named, or `null` |
| `entries` | counted entries |
| `received_at`, `paid_at`, `deadline`, `delivered_at`, `purge_after` | ISO 8601 with +07:00 |
| `revisions_used` | 0–3 |
| `status` | `quoted` → `processing` → `needs-review` → `ready` → `delivered` → (`revision` → `delivered`) → `closed` |
| `notes` | short, no customer content |

## Steps

1. **`งานใหม่`** — create the folder, save the customer's file to `input/`,
   count the entries, check the scope (knowledge/scope-lines.md) and for
   EndNote/Zotero field codes. Reply in Thai with package, price, deadline, and
   the quote message from knowledge/replies.md. Status `quoted`.
2. **`จ่ายแล้ว`** — set `paid_at` and `deadline` (1 day after payment, or 3 h
   for express inside 09–21), status `processing`, and hand the owner the
   "received" message.
3. **Work** — until slice 3 of ref-office-001 lands, the pipeline does not
   exist; do not take real paid jobs before the owner has passed gate G1.
4. **Flags** — anything uncertain goes to `needs-review` with one line per
   entry: which entry, what is uncertain, what you need from the owner.
5. **`พร้อมส่ง`** — status `ready`; give the owner the `out/` path and the
   delivery message filled in with the numbers from the change report.
6. **`ส่งแล้ว`** — set `delivered_at`, `purge_after` = delivered_at + 30 days,
   status `delivered`.
7. **`แก้งาน <id>`** — within the original scope and under 3 revisions it is a
   revision (`revisions_used` + 1); anything new is a new job and needs a quote.

## Purge

The listing promises deletion 30 days after delivery. `bun run jobs` lists
jobs past `purge_after`; with the owner's yes, delete that job folder by its
exact path and set nothing else.
