# Sample workbook placeholder

The original `Zellot_PRISMA-Checkliste.xlsx` is not included in this public repository.

## Expected workbook characteristics

The script expects a workbook with a sheet similar to `Tabelle1` and a structure compatible with the current PRISMA checklist workflow.

Important fields currently used by the script:

- `A` Nr.
- `B` Name des Programms
- `C` Datenbank / may contain multiple links
- `D` Land (Datenbank)
- `E` Quellentyp
- `F` Jahr
- `G:I` Phase 2 criteria
- `J` Phase 2 Entscheidung
- `K` Begründung Phase 2
- `L` manuell überprüfen
- `M:O` Phase 3 criteria
- `P` Begründung Phase 3
- `Q` manuell überprüfen
- `R` Bericht manuell suchen
- `S` Endentscheidung
- `T` Endbegründung

## URL handling

The script currently reads URLs from:

- hyperlink on column `B`
- URL text contained in column `C`
- URL text contained in column `G` when present in the workbook input

The pipeline then:
- considers all row URLs
- may follow a limited set of relevant subpages and downloads
- stores scraped evidence as run artifacts for later inspection

## Recommendation

Create your own workbook from the private template used in your project, or prepare a sanitized workbook with fake projects and public URLs.
