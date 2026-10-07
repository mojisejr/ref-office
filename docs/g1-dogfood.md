# G1 dogfood report — 2026-10-07

Workstream `ref-office-001`, plan 0.2, slice 4. Three documents were run as
real jobs: extract → agent parse → build with live Crossref → review.

## Documents

| # | Source | Entries | Flags (opening policy) | Flags (policy of 13:15) | Build time |
|---|---|---|---|---|---|
| 1 | Real: reference list of a 2022 article in วารสารวิชาการศึกษาศาสตร์ ศรีนครินทรวิโรฒ 23(2), ThaiJO, transcribed into Word | 31 (17 Thai, 14 English) | 25 | 9 | 5–8 s first run, under 2 s cached |
| 2 | Synthetic: [student chapter](../dogfood/synthetic/student-chapter-2.md) with a Word numbered list, APA 6 habits, and three planted in-text errors | 7 | 4 | 0 | 1.2 s |
| 3 | Real: reference list of a second 2022 article in the same journal, transcribed into Word | 32 (28 Thai, 4 English) | not run | 10 | about 5 s |

The real PDFs stay in the ignored `dogfood/private/`. Their Thai text could
not be extracted reliably (sara am lost, spaces inside words), so the lists
were read from the page images and typed as a Word file would hold them.

Every flag left under the current policy is a concrete question: "และคณะ" in a
reference list, a missing thesis level or publisher, a journal name
abbreviated or misspelt, pages that disagree with Crossref, an author name
that disagrees with the publisher's own name, a link whose year does not
match the report.

## Defects found and fixed (each now has a test)

1. A Word numbered list, and lines split with Shift+Enter, were read as one entry.
2. Crossref answered 429 (rate limit); the check reported "not found" and cached it.
3. A broad search missed well-known articles; it now sends author and year range as separate fields.
4. A shortened journal name passed unnoticed; it is now corrected from the matched record and reported.
5. Pages that disagree with the record passed unnoticed; they are now flagged, not overwritten.
6. An article number was printed as pages; it is now `Article N`.
7. Owner flags showed only what the customer wrote; they now show what the entry will become.
8. Conference presentations ("Paper presented at") had no type; `speech` now renders `[Paper presentation]`.
9. Thai works by the same authors in the same year had no ก/ข after the year.

## Policy change during dogfood

Under the opening policy every Thai entry and every article Crossref does not
hold went to the owner: 25 of 31 entries on document 1. The owner accepted
flagging only concrete doubts and disagreements with a real record; unchecked
entries are listed for the customer in the change report instead.

## Not yet known

- Owner minutes per job and tokens per job: measured on the first three real orders (G1, plan 0.2).
- Whether customers send Word or PDF, and how much a PDF job slows the agent.
- Several remaining flags are questions only the customer can answer; whether
  to send those straight to the customer's report is to be decided after real orders.
