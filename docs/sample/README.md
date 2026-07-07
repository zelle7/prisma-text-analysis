# Sample workbook placeholder

The original `Zellot_PRISMA-Checkliste.xlsx` is not included in this public repository.

## Expected workbook characteristics

The script expects a workbook with a sheet similar to `Tabelle1` and a structure compatible with the PRISMA checklist workflow.

Important fields currently used by the script:

- `A` Nr.
- `B` Name des Programms
- `C` Datenbank
- `D` Land (Datenbank)
- `E` Quellentyp
- `F` Jahr
- `G:I` Phase 2 criteria
- `J` Phase 2 Entscheidung
- `K` Begründung Phase 2
- `M:Q` Phase 3 criteria
- `R` Begründung Phase 3
- `T` Endentscheidung / formula field
- `U` Endbegründung
- `AA` manuell überprüfen

## URL handling

The script currently reads URLs from:

- hyperlink on column `B`
- URL text contained in column `C`
- URL text contained in column `G` when present in the workbook input

## Recommendation

Create your own workbook from the private template used in your project, or prepare a sanitized workbook with fake projects and public URLs.
