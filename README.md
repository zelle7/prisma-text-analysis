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
