# Writing work/parsed.json (agent)

`bun run job extract <id>` writes `work/entries.txt`, one numbered customer
entry per line. You turn each into one item in `work/parsed.json`. The guard
rejects the file unless every entry number appears exactly once, as an item or
as a skipped line, and unless each item's first author, year, and most title
words are visible in its own entry.

```json
{
  "items": [
    {
      "source": 1,
      "lang": "en",
      "csl": { "type": "book", "author": [{ "family": "Vygotsky", "given": "L. S." }],
               "issued": { "date-parts": [[1978]] },
               "title": "Mind in society: The development of higher psychological processes",
               "publisher": "Harvard University Press" },
      "fixes": ["ย้ายปีไปไว้หลังชื่อผู้แต่ง", "เพิ่มจุลภาคหลังนามสกุล"],
      "uncertain": []
    }
  ],
  "skipped": [{ "source": 9, "reason": "a sentence from the appendix, not a reference" }]
}
```

## Rules

- **Only what the customer wrote.** Never add a fact that is not in the entry.
  Missing volume, pages, or DOI are filled by Crossref in the build, not by you.
  Missing year: `"issued": { "literal": "n.d." }` (Thai: `"ม.ป.ป."`) and add a
  `fixes` note so the customer sees it.
- **lang** is the language of the work: `th` for Thai works, `en` otherwise.
- **English names:** `{ "family": "Hair", "given": "J. F." }`, initials with
  periods and spaces. Group authors: `{ "literal": "American Psychological Association" }`.
- **Thai names:** always `{ "literal": "กีรติ บุญเจือ" }`, written as given, never split.
- **Years:** Thai works keep the Buddhist-era year the customer used (2547);
  English works use the Common Era year.
- **Titles of books, chapters, articles, theses, web pages:** sentence case in
  English (capitalise the first word, the first word after a colon, and proper
  nouns). **Journal names** keep title case as published.
- **type:** `book`, `chapter` (also a paper in proceedings with an editor),
  `paper-conference`, `article-journal`, `thesis` (with `genre`:
  "Master's thesis", "Doctoral dissertation", "วิทยานิพนธ์มหาบัณฑิต",
  "วิทยานิพนธ์ดุษฎีบัณฑิต" and `publisher` = the university), `webpage`, `report`.
- **edition** as a number string (`"7"`); `page` as written (`"24-39"`); `DOI`
  without the `https://doi.org/` prefix.
- **fixes** (Thai, short): what you changed and why, for the customer's report.
- **uncertain** (Thai): anything you are not sure of. It blocks release until
  the owner approves, so use it whenever an entry could be read two ways.
- **skipped:** a line that is not a reference (a stray heading, a sentence).
  Never skip a real reference, even a broken one.

After writing it, run `bun run job build <id>`.
