import { z } from "zod";

export const prismaAgentResultSchema = z.object({
  jahr: z.string().min(4).max(20).nullable(),
  phase2: z.object({
    zielgruppeSek2: z.enum(["Ja", "Nein"]),
    massnahmeFuerSchule: z.enum(["Ja", "Nein"]),
    stressbewaeltigungOderResilienz: z.enum(["Ja", "Nein"]),
    entscheidung: z.enum(["eingeschlossen", "ausgeschlossen"]),
  }),
  phase2Begruendung: z.string().min(1).optional(),
  phase2ManualReview: z.enum(["Ja", "Nein"]),
  phase3: z.object({
    theoriebasiert: z.enum(["erfüllt", "nicht erfüllt", "nicht geprüft"]),
    evaluationsberichtVorhanden: z.enum(["erfüllt", "nicht erfüllt", "nicht geprüft"]),
    transparentDokumentiert: z.enum(["erfüllt", "nicht erfüllt", "nicht geprüft"]),
  }),
  phase3Begruendung: z.string().min(1).optional(),
  phase3ManualReview: z.enum(["Ja", "Nein"]),
  berichtManuellSuchen: z.enum(["Ja", "Nein"]),
  confidence: z.enum(["hoch", "mittel", "niedrig"]),
  manualReview: z.enum(["Ja", "Nein"]),
  finalDecision: z.enum(["Einschluss", "Ausschluss"]),
  endbegruendung: z.string().min(1),
  evidenceUrls: z.array(z.string().url()).default([]),
  notes: z.array(z.string()).optional(),
  criterionReasoning: z
    .object({
      phase2: z.record(z.string(), z.string()).optional(),
      phase3: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type PrismaAgentResultSchema = z.infer<typeof prismaAgentResultSchema>;
