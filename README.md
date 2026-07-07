# prisma-analyser

Local PRISMA screening helper for a PRISMA checklist workbook.

## What this project does

This project runs a local pipeline that:

- reads a PRISMA Excel workbook
- extracts candidate rows and URLs
- scrapes linked web pages and PDFs
- sends the gathered evidence to a **pi SDK agent**
- asks the agent to return structured PRISMA decisions
- writes the results back into a new Excel workbook
- stores per-row reasoning and review artifacts on disk

The script is designed for iterative runthroughs, so multiple analysis passes can coexist safely.

## High-level workflow

For each workbook row, the script does this:

1. read row metadata and links
2. scrape linked pages
3. extract PDF text if needed
4. filter evidence to reduce generic noise
5. send row + evidence to the pi agent
6. validate the returned JSON
7. write values back into Excel
8. write detailed reasoning JSON per row
9. optionally add the row to a review queue

## Workbook fields currently filled

The script writes to the updated workbook structure:

- `F` Jahr
- `G:I` Phase 2 criteria
- `J` Phase 2 Entscheidung
- `K` Begründung Phase 2
- `M:Q` Phase 3 criteria
- `R` Begründung Phase 3
- `U` Endbegründung
- `AA` manuell überprüfen

Decision coloring:

- `J` and `T`
- green for Einschluss / eingeschlossen
- red for Ausschluss / ausgeschlossen

## Setup

```bash
npm install
```

The pi SDK needs an available authenticated model.

Examples:

- existing pi auth in `~/.pi/agent/auth.json`
- supported provider API keys configured for pi

## Basic run

Use your own workbook path:

```bash
npm run prisma-agent -- --input /path/to/your/Zellot_PRISMA-Checkliste.xlsx --limit 3
```

## Runthroughs

Each run gets a dedicated output area.

If you pass a run ID:

```bash
npm run prisma-agent -- --run-id batch-01
```

outputs go to:

```text
runs/batch-01/
```

If you do not pass `--run-id`, a timestamp-based run ID is generated automatically.

Default run outputs:

- filled workbook
- checkpoint file
- review queue file
- per-row reasoning files

## Recommended real run

```bash
npm run prisma-agent -- \
  --input /path/to/your/Zellot_PRISMA-Checkliste.xlsx \
  --run-id first-pass-2026-07 \
  --model nvidia/meta/llama-3.1-70b-instruct
```

## Important options

- `--run-id <id>` group all outputs for a run
- `--force` process rows even if workbook cells already contain output
- `--retry-errors` retry rows previously marked as error in the checkpoint
- `--model provider/model` choose the pi model explicitly
- `--reasoning-dir <dir>` override the reasoning output directory
- `--review-queue <file>` override the review queue file
- `--output <file>` override the output workbook path
- `--checkpoint <file>` override the checkpoint path
- `--limit <n>` only process the first eligible rows
- `PRISMA_PI_TIMEOUT_MS` override per-row AI analysis timeout (default: `300000` = 5 minutes)

## Resume and skip behavior

By default the script skips rows when they already contain output in the workbook or when the checkpoint marks them as done.

This makes it safe to stop and continue later.

## Review mode

Rows are still written to Excel even when uncertain.
Additionally, rows are added to a separate review queue when:

- `manualReview === "Ja"`
- confidence is low
- notes indicate uncertainty

## Reasoning artifacts

For every processed row, a JSON file is written with:

- row metadata
- structured result
- evidence documents
- criterion reasoning
- timestamps

This is useful if you want to inspect why the agent decided something.

## Workbook template note

The original private workbook is intentionally **not** included in this public repository.
See:

- `docs/sample/README.md`

for the expected workbook structure.

## Prompt / agent behavior

The main PRISMA agent prompt lives here:

- `src/prisma/prompts.ts`

If you want to adapt the analysis behavior, this is the main place to edit.

Typical reasons to change it:

- refine PRISMA inclusion criteria
- change what counts as theory-based
- tighten or loosen manual review conditions
- change the expected JSON schema
- ask for shorter or longer justifications

Related files:

- `src/prisma/schema.ts` — validates the JSON the agent must return
- `src/prisma/agent.ts` — runs the pi SDK session and timeout logic
- `src/prisma/excel.ts` — maps returned fields into workbook columns
- `src/prisma/scrape.ts` — controls evidence gathering

### Important note about prompt changes

If you change the prompt output structure, also update:

- `src/prisma/schema.ts`
- `src/prisma/types.ts`
- possibly `src/prisma/excel.ts`

Otherwise the agent output and the validation/writing logic may no longer match.

## Where the actual AI call happens

The script does not write Excel by asking the agent to manipulate files directly.

Instead:

1. the script gathers evidence
2. the pi agent returns structured JSON
3. the script validates that JSON
4. the script writes the workbook itself

This keeps runs safer and easier to debug.

## Current structure

Key files:

- `scripts/prisma-agent.ts` — CLI entry point
- `src/prisma/agent.ts` — pi SDK integration
- `src/prisma/prompts.ts` — PRISMA decision prompt
- `src/prisma/schema.ts` — zod schema for agent output
- `src/prisma/excel.ts` — workbook reading/writing
- `src/prisma/scrape.ts` — HTML/PDF scraping
- `src/prisma/checkpoint.ts` — resume logic
- `src/prisma/review.ts` — review queue handling
- `src/prisma/reasoning.ts` — per-row reasoning files

## Limitations / things to keep in mind

- results still need human review for important decisions
- model quality depends on the selected provider/model
- some sites block scraping or return incomplete content
- evidence filtering is heuristic, not perfect
- workbook formulas are preserved, but Excel remains the source for final manual review
- webpage and PDF contents are sent to the selected model provider; do not use confidential input data unless your provider setup is appropriate for that

## License

This project is released under the terms in `LICENSE`.

In short:

- use it, change it, publish it, sell it if you want
- there is **no support obligation**
- it is provided **as-is**
- third-party dependency licenses still apply and must be followed
