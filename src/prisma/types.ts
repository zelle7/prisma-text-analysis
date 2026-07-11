export type Phase2JaNein = "Ja" | "Nein";
export type Phase2Decision = "eingeschlossen" | "ausgeschlossen";
export type Phase3Status = "erfüllt" | "nicht erfüllt" | "nicht geprüft";
export type FinalDecision = "Einschluss" | "Ausschluss";
export type ManualReviewStatus = "Ja" | "Nein";

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
  existingManualReview?: string;
}

export interface EvidenceDocument {
  url: string;
  finalUrl?: string;
  title?: string;
  contentType?: string;
  text: string;
  excerpt: string;
  error?: string;
  sourceType?: "input" | "discovered";
  relevanceHint?: "generic" | "candidate";
  artifactPath?: string;
}

export interface PrismaAgentResult {
  jahr: string | null;
  phase2: {
    zielgruppeSek2: Phase2JaNein;
    massnahmeFuerSchule: Phase2JaNein;
    stressbewaeltigungOderResilienz: Phase2JaNein;
    entscheidung: Phase2Decision;
  };
  phase2Begruendung?: string;
  phase2ManualReview: ManualReviewStatus;
  phase3: {
    theoriebasiert: Phase3Status;
    evaluationsberichtVorhanden: Phase3Status;
    transparentDokumentiert: Phase3Status;
  };
  phase3Begruendung?: string;
  phase3ManualReview: ManualReviewStatus;
  berichtManuellSuchen: ManualReviewStatus;
  confidence: "hoch" | "mittel" | "niedrig";
  manualReview: ManualReviewStatus;
  finalDecision: FinalDecision;
  endbegruendung: string;
  evidenceUrls: string[];
  notes?: string[];
  criterionReasoning?: {
    phase2?: Record<string, string>;
    phase3?: Record<string, string>;
  };
}

export interface WorkbookWriteResult {
  updatedRows: number;
  skippedRows: number;
}
