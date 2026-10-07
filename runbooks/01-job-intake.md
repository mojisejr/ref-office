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

1. **`งานใหม่`** — `bun run job new <alias>`, save the customer's file to
   `input/`, then `bun run job extract <id>`. It counts the entries and reports
   EndNote/Zotero field codes (if any: replies.md #5, stop). Check the scope
   (knowledge/scope-lines.md). Reply in Thai with package, price, deadline, and
   the quote message from knowledge/replies.md. Set `package`,
   `check_in_text`, `entries`, and `order`/`font` if the customer asked. Status `quoted`.
2. **`จ่ายแล้ว`** — set `paid_at` and `deadline` (1 day after payment, or 3 h
   for express inside 09–21), status `processing`, and hand the owner the
   "received" message.
   **PDF instead of Word:** do not trust extracted Thai text (sara am is lost
   and spaces appear inside words). Read the reference pages as images, type
   the list as printed into `input/<name>.txt` (one entry per paragraph, a
   blank line between), keep the PDF beside it, and quote a longer deadline.
3. **Parse** — write `work/parsed.json` from `work/entries.txt` following
   [knowledge/parse-contract.md](../knowledge/parse-contract.md).
4. **Build** — `bun run job build <id>`. Exit codes: `0` ready, `2` needs
   review, `3` guard failed (fix parsed.json, never the guard), `4` field codes.
5. **Flags** — on exit 2, show the owner `work/flags.md` in Thai, one line per
   entry. When the owner approves, `bun run job approve <id> <n>...` and build
   again; when the owner corrects, fix parsed.json and build again.
6. **`พร้อมส่ง`** — status `ready`; give the owner the `out/` path and the
   delivery message filled in with the numbers from the change report.
7. **`ส่งแล้ว`** — set `delivered_at`, `purge_after` = delivered_at + 30 days,
   status `delivered`.
8. **`แก้งาน <id>`** — within the original scope and under 3 revisions it is a
   revision (`revisions_used` + 1); anything new is a new job and needs a quote.

## Purge

The listing promises deletion 30 days after delivery. `bun run jobs` lists
jobs past `purge_after`; with the owner's yes, delete that job folder by its
exact path and set nothing else.
