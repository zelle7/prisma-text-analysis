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
npm run prisma-agent -- --input docs/Zellot_PRISMA-Checkliste.xlsx --output docs/Zellot_PRISMA-Checkliste.filled.xlsx --limit 3
```

### Resume / skip behavior

By default the script skips rows that already have values in decision/reason columns or are marked done in the checkpoint file.

```bash
npm run prisma-agent -- --checkpoint .prisma-checkpoint.json
```

Options:

- `--force` process rows even if they already have output
- `--retry-errors` retry rows previously marked as error in the checkpoint
- `--model provider/model` choose a specific pi model
- `--reasoning-dir artifacts/reasoning` store full per-row reasoning JSON files
- `--review-queue artifacts/review-queue.json` collect low-confidence / uncertain rows for manual review
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
