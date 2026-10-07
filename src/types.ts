// Shapes shared by the pipeline. CSL-JSON is the subset the office uses.

export type Name = { family: string; given?: string } | { literal: string };

export type Csl = {
  type: "book" | "chapter" | "article-journal" | "thesis" | "paper-conference" | "webpage" | "report";
  author?: Name[];
  editor?: Name[];
  issued?: { "date-parts": [[number, number?, number?]] } | { literal: string };
  title: string;
  "container-title"?: string;
  volume?: string;
  issue?: string;
  page?: string;
  /** Article number (eLocator); APA prints it as "Article 100924" in place of pages. */
  number?: string;
  edition?: string;
  publisher?: string;
  genre?: string;
  archive?: string;
  URL?: string;
  DOI?: string;
  "year-suffix"?: string;
};

/** One customer entry as the agent parsed it. `source` is the 1-based entry number from extract. */
export type ParsedItem = {
  source: number;
  lang: "th" | "en";
  csl: Csl;
  /** Agent's own doubts; any entry here blocks release until the owner approves. */
  uncertain?: string[];
  /** What the agent corrected from the raw text, in Thai, for the change report. */
  fixes?: string[];
};

/** An extracted entry the agent judged not to be a reference (a stray line), with the reason. */
export type Skipped = { source: number; reason: string };

export type Parsed = { items: ParsedItem[]; skipped?: Skipped[] };

export type Extract = {
  entries: string[];
  body: string;
  heading: string | null;
  fieldCodes: string[];
};

export type Status = "verified" | "format-only" | "needs-review";

export type Checked = ParsedItem & {
  status: Status;
  reasons: string[];
  /** Fields filled or corrected from a real source, in Thai, for the change report. */
  sourced: string[];
};

export type Job = {
  id: string;
  alias: string;
  package: "start" | "chapter" | "express";
  style: "apa7";
  check_in_text: boolean;
  institution: string | null;
  entries: number;
  order?: "thai-first" | "english-first";
  font?: "th-sarabun-16" | "times-12";
  received_at: string | null;
  paid_at: string | null;
  deadline: string | null;
  delivered_at: string | null;
  purge_after: string | null;
  revisions_used: number;
  status: string;
  notes: string;
};
