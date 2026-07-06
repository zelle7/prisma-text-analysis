export type Phase2JaNein = "Ja" | "Nein";
export type Phase2Decision = "eingeschlossen" | "ausgeschlossen";
export type Phase3Status = "erfüllt" | "nicht erfüllt";
export type FinalDecision = "Einschluss" | "Ausschluss";

export interface PrismaRowInput {
  rowNumber: number;
  nr?: number | string;
  programName: string;
  datenbank?: string;
  land?: string;
  quellentyp?: string;
  jahr?: string | number | null;
  urls: string[];
  existingDecision?: string;
  existingReason?: string;
}

export interface EvidenceDocument {
  url: string;
  finalUrl?: string;
  title?: string;
  contentType?: string;
  text: string;
  excerpt: string;
  error?: string;
}

export interface PrismaAgentResult {
  phase2: {
    zielgruppeSek2: Phase2JaNein;
    massnahmeFuerSchule: Phase2JaNein;
    stressbewaeltigungOderResilienz: Phase2JaNein;
    entscheidung: Phase2Decision;
  };
  phase3: {
    theoriebasiert: Phase3Status;
    evaluationsberichtVorhanden: Phase3Status;
    transparentDokumentiert: Phase3Status;
    transferierbarkeitOesterreich: Phase3Status;
    niederschwelligerZugang: Phase3Status;
  };
  finalDecision?: FinalDecision;
  begruendung: string;
  evidenceUrls: string[];
  notes?: string[];
}

export interface WorkbookWriteResult {
  updatedRows: number;
  skippedRows: number;
}
