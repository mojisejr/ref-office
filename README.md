# ref-office

The office behind an APA 7 bibliography service sold on Fastwork. An agent
works here; the owner talks to customers on Fastwork and reviews only what the
checker flags. Customer files never enter this repository.

## Layout

| Path | What it holds |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | How the agent runs the office desk in a session |
| [`runbooks/`](runbooks/) | Step-by-step procedures. Start with [00-owner-3-minutes](runbooks/00-owner-3-minutes.md) |
| [`knowledge/`](knowledge/) | APA 7 rules, Thai rules, ready replies, scope lines |
| [`shop/`](shop/listing.md) | The approved Fastwork listing: description, packages, banner |
| [`jobs/`](jobs/) | One folder per order. Ignored by git except the README and template |
| [`scripts/`](scripts/) | `bun run jobs` lists open jobs by deadline; `bun run job new\|extract\|build\|approve` runs one job |
| [`src/`](src/) | The pipeline: extract → guard → Crossref check → APA 7 render (citeproc for English, Thai renderer) → docx/pdf → in-text cross-check → change report |
| [`tests/`](tests/) | Hand-written golden set and seeded-error tests (`bun test`) |
| [`styles/`](styles/) | `apa.csl`, pinned to the commit named in `styles/SOURCE` |
| [`docker/pdf/`](docker/pdf/) | LibreOffice image for docx → pdf: `docker build -t ref-office-pdf:1 docker/pdf` |

Requires Bun, pandoc 3, `zip`/`unzip`, and Docker for PDF output.

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may
read and learn from this repository; commercial use is not permitted.
`styles/apa.csl` keeps its own CC BY-SA 3.0 license (see `styles/SOURCE`).

Required Notice: Copyright (c) 2026 mojisejr (https://github.com/mojisejr)
