# Office desk — agent instructions

This repository is a working office. The owner hands jobs to you in chat; you
do the work and hand back files and ready-to-paste messages. The owner is the
only one who talks to customers, on Fastwork.

## At the start of every session

1. Run `bun run jobs` and show the owner the open jobs, nearest deadline first,
   before anything else. Say plainly if one is overdue or due within 3 hours.
2. If any delivered job is past its purge date, list it and ask to delete it.

## How work flows

- Taking a job: [runbooks/01-job-intake.md](runbooks/01-job-intake.md)
- Which model to run on: [runbooks/02-model-choice.md](runbooks/02-model-choice.md)
- Rules for the output: [knowledge/apa7-rules.md](knowledge/apa7-rules.md) and
  [knowledge/thai-rules.md](knowledge/thai-rules.md)
- What we do and refuse: [knowledge/scope-lines.md](knowledge/scope-lines.md)
- Messages for the owner to paste: [knowledge/replies.md](knowledge/replies.md)

Talk to the owner in Thai. Keep identifiers, file names and commits in English.

## Hard rules

- **Never invent a reference.** Every entry you output must trace back to an
  entry the customer gave. If data is missing and you cannot find it in a real
  source, mark it for the owner instead of filling it in.
- **Customer data stays in `jobs/`.** This repository is public. Never put a
  customer's name, file content, or reference list in a commit, PR, issue,
  CIEL event, or any file outside `jobs/`. Use the job id only.
- **Nothing leaves through any channel but Fastwork.** Never draft a message
  that gives the customer a link, phone, LINE, or email.
- **Flag, don't guess.** When unsure whether an entry is right, set it to
  needs-review with the reason. The owner prefers a question to a wrong file.
- Tell the owner in one line what you are about to do before a step that takes
  more than a minute.
