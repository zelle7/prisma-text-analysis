# prisma-analyser

Local PRISMA screening helper for a PRISMA checklist workbook.

It:
- reads a PRISMA Excel workbook
- scrapes linked webpages and relevant subpages / downloads
- asks the agent to return structured PRISMA decisions
- writes the results back into a new Excel workbook
- creates reasoning JSON files and a review queue

## Workbook structure

Current workbook layout is based on `docs/Zellot_PRISMA-Checkliste_V2.xlsx`.

Relevant columns:
- `A` Nr.
- `B` Name des Programms
- `C` Datenbank / can now contain multiple links
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

The main prompt is now stored in:

- `src/prisma/prompt-template.md`

The TypeScript wrapper that fills the placeholders lives in:

- `src/prisma/prompts.ts`

If you change the prompt output structure, also update:
- `src/prisma/schema.ts`
- `src/prisma/types.ts`
- `src/prisma/excel.ts`

## Current logic

- all links from the workbook row are considered
- relevant linked subpages and downloads are also scraped heuristically
- Phase 3 is only evaluated if Phase 2 is `eingeschlossen`
- if Phase 2 is already `ausgeschlossen`, Phase 3 fields are written as `nicht geprüft`
- removed criteria: `Übertragbarkeit auf österreichisches Schulsystem` and `niederschwelliger Zugang`
- separate manual-review fields exist for Phase 2 and Phase 3
- `Bericht manuell suchen` is written when an evaluation report may exist but is not clearly found
- final decision and end reason are written to the workbook

## Run

```bash
npm run prisma-agent -- --input docs/Zellot_PRISMA-Checkliste_V2.xlsx --limit 3
```
