import ExcelJS from "exceljs";
import type { PrismaAgentResult, PrismaRowInput, WorkbookWriteResult } from "./types.js";

const DATA_START_ROW = 4;
const SHEET_NAME = "Tabelle1";

function splitUrls(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value));
}

function getCellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  return String(value);
}

function extractHyperlink(cell: ExcelJS.Cell): string | undefined {
  const value = cell.value;
  if (value && typeof value === "object" && "hyperlink" in value && typeof value.hyperlink === "string") {
    return value.hyperlink;
  }
  return undefined;
}

export async function loadWorkbookRows(path: string): Promise<{ workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet; rows: PrismaRowInput[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const worksheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found");

  const rows: PrismaRowInput[] = [];

  for (let rowNumber = DATA_START_ROW; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const programName = getCellText(row.getCell("B")).trim();
    if (!programName) continue;

    const hyperlink = extractHyperlink(row.getCell("B"));
    const textUrls = [
      getCellText(row.getCell("B")),
      getCellText(row.getCell("C")),
      getCellText(row.getCell("Q")),
    ].flatMap(splitUrls);

    const urls = [...new Set([hyperlink, ...textUrls].filter((value): value is string => Boolean(value)))];

    rows.push({
      rowNumber,
      nr: row.getCell("A").value as string | number | undefined,
      programName,
      datenbank: getCellText(row.getCell("C")),
      land: getCellText(row.getCell("D")),
      quellentyp: getCellText(row.getCell("E")),
      jahr: getCellText(row.getCell("F")) || null,
      urls,
    });
  }

  return { workbook, worksheet, rows };
}

export function writeResult(worksheet: ExcelJS.Worksheet, rowNumber: number, result: PrismaAgentResult): void {
  worksheet.getCell(`G${rowNumber}`).value = result.phase2.zielgruppeSek2;
  worksheet.getCell(`H${rowNumber}`).value = result.phase2.massnahmeFuerSchule;
  worksheet.getCell(`I${rowNumber}`).value = result.phase2.stressbewaeltigungOderResilienz;
  worksheet.getCell(`J${rowNumber}`).value = result.phase2.entscheidung;
  worksheet.getCell(`K${rowNumber}`).value = result.phase3.theoriebasiert;
  worksheet.getCell(`L${rowNumber}`).value = result.phase3.evaluationsberichtVorhanden;
  worksheet.getCell(`M${rowNumber}`).value = result.phase3.transparentDokumentiert;
  worksheet.getCell(`N${rowNumber}`).value = result.phase3.transferierbarkeitOesterreich;
  worksheet.getCell(`O${rowNumber}`).value = result.phase3.niederschwelligerZugang;
  worksheet.getCell(`Q${rowNumber}`).value = result.begruendung;
}

export async function saveWorkbook(workbook: ExcelJS.Workbook, outputPath: string): Promise<WorkbookWriteResult> {
  await workbook.xlsx.writeFile(outputPath);
  return { updatedRows: 0, skippedRows: 0 };
}
