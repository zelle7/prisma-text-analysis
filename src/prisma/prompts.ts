import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { EvidenceDocument, PrismaRowInput } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptTemplate = readFileSync(join(__dirname, "prompt-template.md"), "utf8");

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((output, [key, value]) => output.replaceAll(`{{${key}}}`, value), template);
}

export function buildPrismaPrompt(row: PrismaRowInput, evidence: EvidenceDocument[]): string {
  const evidenceText = evidence
    .map((doc, index) => {
      const status = doc.error ? `FEHLER: ${doc.error}` : "OK";
      return [
        `## Quelle ${index + 1}`,
        `URL: ${doc.url}`,
        doc.finalUrl ? `Final URL: ${doc.finalUrl}` : undefined,
        doc.title ? `Titel: ${doc.title}` : undefined,
        `Status: ${status}`,
        `Textauszug:`,
        doc.text.slice(0, 12000),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return fillTemplate(promptTemplate, {
    rowNumber: String(row.rowNumber),
    nr: String(row.nr ?? ""),
    programName: row.programName,
    datenbank: row.datenbank ?? "",
    land: row.land ?? "",
    quellentyp: row.quellentyp ?? "",
    jahr: row.jahr == null ? "" : String(row.jahr),
    urls: row.urls.join(", "),
    evidenceText,
  });
}
