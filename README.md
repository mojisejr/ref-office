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
| [`jobs/`](jobs/) | One folder per order. Ignored by git except the README and template |
| [`scripts/`](scripts/) | Office tools. `bun run jobs` lists open jobs by deadline |

The formatting pipeline and its checker arrive in a later slice of the
`ref-office-001` workstream.

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may
read and learn from this repository; commercial use is not permitted.

Required Notice: Copyright (c) 2026 mojisejr (https://github.com/mojisejr)
