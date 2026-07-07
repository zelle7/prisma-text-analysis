# prisma-analyser

Local PRISMA screening helper for `docs/Zellot_PRISMA-Checkliste.xlsx`.

## What it does

- reads the Excel workbook
- extracts candidate rows
- reads hyperlink URLs from column `B`
- scrapes linked pages
- sends row + evidence into a pi SDK agent
- writes Phase 2 / Phase 3 results back into the workbook

## Setup

```bash
npm install
```

The pi SDK needs a configured model/provider. Either:

- have your pi auth already configured in `~/.pi/agent/auth.json`, or
- export provider API keys supported by pi

## Run

```bash
npm run prisma-agent -- --input docs/Zellot_PRISMA-Checkliste.xlsx --limit 3
```

By default, each run gets a runthrough ID and writes outputs under `runs/<run-id>/`.
If `--run-id` is omitted, a timestamp is used automatically.

```bash
npm run prisma-agent -- --run-id test-batch-01
```

### Resume / skip behavior

By default the script skips rows that already have values in decision/reason columns or are marked done in the checkpoint file.

```bash
npm run prisma-agent -- --checkpoint .prisma-checkpoint.json
```

Options:

- `--run-id <id>` group workbook output, checkpoint, reasoning, and review queue under one run directory
- `--force` process rows even if they already have output
- `--retry-errors` retry rows previously marked as error in the checkpoint
- `--model provider/model` choose a specific pi model
- `--reasoning-dir <dir>` override default reasoning dir for the run
- `--review-queue <file>` override default review queue file for the run
- `--output <file>` override default output workbook path for the run
- `--checkpoint <file>` override default checkpoint path for the run
- `PRISMA_PI_TIMEOUT_MS` override per-row AI analysis timeout (default: `300000` = 5 minutes)

## Review mode

Rows with `confidence=niedrig` or non-empty `notes` are still written to Excel, but they are also added to a separate review queue JSON file for manual follow-up.

## Current scope

Implemented first scaffold:

- Excel read/write
- hyperlink extraction
- scraping of HTML/text pages
- pi SDK prompt-based structured analysis

Not yet implemented:

- CSV import into workbook
- PDF extraction
- checkpoint/resume
- automatic discovery of extra related links
- richer custom pi tools for browser-like crawling
