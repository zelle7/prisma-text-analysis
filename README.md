# prisma-analyser

Local PRISMA screening helper for a PRISMA checklist workbook.

It:
- reads a PRISMA Excel workbook
- collects all links from a row
- scrapes linked webpages plus selected relevant subpages / downloads
- asks the agent to return structured PRISMA decisions
- writes the results back into a new Excel workbook
- creates reasoning JSON files, evidence artifacts, checkpoints, and a review queue

## Workbook structure

Current workbook layout is based on `docs/Zellot_PRISMA-Checkliste_V2.xlsx`.

Relevant columns:
- `A` Nr.
- `B` Name des Programms
- `C` Datenbank / can contain multiple links
- `D` Land
- `E` Quellentyp
- `F` Jahr
- `G` Zielgruppe Sek 2
- `H` Maßn. f. Schule
- `I` Stressbewältigung oder Resilienzförderung
- `J` Eingeschlossen/Ausgeschlossen
- `K` Begründung Phase 2
- `L` manuell überprüfen
- `M` Theoriebasiert
- `N` Evaluationsbericht vorhanden
- `O` transparent dokumentiert
- `P` Begründung Phase 3
- `Q` manuell überprüfen
- `R` Bericht manuell suchen
- `S` Entscheidung
- `T` Endbegründung

## Prompt / agent behavior

The main prompt is stored in:
- `src/prisma/prompt-template.md`

The wrapper that fills the placeholders lives in:
- `src/prisma/prompts.ts`

If you change the prompt output structure, also update:
- `src/prisma/schema.ts`
- `src/prisma/types.ts`
- `src/prisma/excel.ts`

## Current logic

- all links from the workbook row are considered
- multiple links in column `C` are supported
- selected relevant subpages and downloads are scraped heuristically
- subpage discovery is limited and scored using the program name to reduce generic pages
- evidence is saved as run artifacts for later inspection
- Phase 3 is only evaluated if Phase 2 is `eingeschlossen`
- if Phase 2 is already `ausgeschlossen`, Phase 3 fields are written as `nicht geprüft`
- removed criteria:
  - `Übertragbarkeit auf österreichisches Schulsystem`
  - `niederschwelliger Zugang`
- separate manual-review fields exist for Phase 2 and Phase 3
- `Bericht manuell suchen` is written when an evaluation report may exist but is not clearly found
- final decision and end reason are written to the workbook
- manual review values are normalized before schema validation for more robust runs

## Run artifacts

Each run writes to `runs/<run-id>/`.

Important outputs:
- filled workbook
- `checkpoint.json`
- `review-queue.json`
- `reasoning/` per-row JSON files
- `evidence/` per-row scraped evidence artifacts

Each evidence artifact contains:
- source URL
- final URL
- title
- content type
- source type
- relevance hint
- scrape error if any
- extracted text used for inspection

## Setup

This project uses the pi Coding Agent SDK. Before running the PRISMA analyser, make sure pi is configured locally so the script can access a model.

Helpful pi documentation:
- Main pi documentation: https://www.npmjs.com/package/@earendil-works/pi-coding-agent
- Local pi README used by this project setup: `/home/linuxbrew/.linuxbrew/lib/node_modules/@earendil-works/pi-coding-agent/README.md`
- Provider and model setup in the pi docs: `docs/providers.md`

Typical setup steps:
1. Install dependencies with `npm install`
2. Configure a pi-compatible model/provider
3. Make sure authentication is available, for example via `~/.pi/agent/auth.json` or provider API keys
4. Optionally choose a model explicitly with `--model <provider/model>`

If no model is configured, the analyser cannot call the agent and will fail with a model/setup error.

## CLI usage

Basic run:

```bash
npm run prisma-agent -- --input docs/Zellot_PRISMA-Checkliste_V2.xlsx --limit 3
```

Verbose run:

```bash
npm run prisma-agent -- --input docs/Zellot_PRISMA-Checkliste_V2.xlsx --limit 3 --verbose
```

Useful flags:
- `--limit <n>` process only the first `n` eligible rows
- `--run-id <id>` write outputs into `runs/<id>/`
- `--verbose` show scrape progress and live agent output
- `--retry-errors` retry rows that previously failed in the checkpoint
- `--force` ignore existing workbook values and process rows anyway
- `--model <provider/model>` choose a specific pi model

## Notes

- results still require human review for important decisions
- some websites block scraping or expose only partial content
- evidence selection is heuristic and intentionally conservative
- Excel remains the final review surface
