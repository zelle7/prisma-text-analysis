import type { EvidenceDocument, PrismaRowInput } from "./types.js";

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

  return `Du analysierst Programme für eine PRISMA-Checkliste zur Auswahl von Best Practices im schulischen Kontext.\n\nBeurteile das Programm streng anhand der folgenden Kriterien und gib ausschließlich JSON zurück. Keine Markdown-Ausgabe. Keine Einleitung.\n\nProgramm-Metadaten:\n- Zeile: ${row.rowNumber}\n- Nr.: ${row.nr ?? ""}\n- Name des Programms: ${row.programName}\n- Datenbank: ${row.datenbank ?? ""}\n- Land: ${row.land ?? ""}\n- Quellentyp: ${row.quellentyp ?? ""}\n- Jahr: ${row.jahr ?? ""}\n- URLs: ${row.urls.join(", ")}\n\nPhase 2 Kriterien:\n- zielgruppeSek2: Ja, wenn sich die Maßnahme an 15-19 Jährige oder allgemein Jugendliche/junge Erwachsene richtet.\n- massnahmeFuerSchule: Ja, wenn die Maßnahme für die Schule bzw. den Schulalltag gedacht ist. Nein bei Klinik, stationärem Aufenthalt oder Therapiesitzungen.\n- stressbewaeltigungOderResilienz: Ja, wenn die Maßnahme Stressbewältigung, Resilienz oder psychosoziale Gesundheit fördert.\n- entscheidung: eingeschlossen nur wenn alle drei Phase-2-Kriterien Ja sind, sonst ausgeschlossen.\n\nPhase 3 Kriterien (nur inhaltlich bewerten, auch wenn Phase 2 ausgeschlossen ist):\n- theoriebasiert\n- evaluationsberichtVorhanden\n- transparentDokumentiert\n- transferierbarkeitOesterreich\n- niederschwelligerZugang\n\nFür Phase 3 immer nur \"erfüllt\" oder \"nicht erfüllt\" ausgeben. Wenn Informationen fehlen, dann \"nicht erfüllt\".\n\nZusätzlich:\n- begruendung: kurze, präzise Begründung auf Deutsch, 2-6 Sätze\n- evidenceUrls: nur URLs verwenden, die wirklich für die Entscheidung relevant waren\n- notes: optionale kurze Stichpunkte zu Unsicherheiten\n- finalDecision: Einschluss nur wenn Phase 2 eingeschlossen und alle Phase-3-Kriterien erfüllt sind, sonst Ausschluss\n\nErwartetes JSON-Schema:\n{\n  \"phase2\": {\n    \"zielgruppeSek2\": \"Ja\" | \"Nein\",\n    \"massnahmeFuerSchule\": \"Ja\" | \"Nein\",\n    \"stressbewaeltigungOderResilienz\": \"Ja\" | \"Nein\",\n    \"entscheidung\": \"eingeschlossen\" | \"ausgeschlossen\"\n  },\n  \"phase3\": {\n    \"theoriebasiert\": \"erfüllt\" | \"nicht erfüllt\",\n    \"evaluationsberichtVorhanden\": \"erfüllt\" | \"nicht erfüllt\",\n    \"transparentDokumentiert\": \"erfüllt\" | \"nicht erfüllt\",\n    \"transferierbarkeitOesterreich\": \"erfüllt\" | \"nicht erfüllt\",\n    \"niederschwelligerZugang\": \"erfüllt\" | \"nicht erfüllt\"\n  },\n  \"finalDecision\": \"Einschluss\" | \"Ausschluss\",\n  \"begruendung\": \"...\",\n  \"evidenceUrls\": [\"https://...\"],\n  \"notes\": [\"...\"]\n}\n\nQuellenmaterial:\n${evidenceText}`;
}
