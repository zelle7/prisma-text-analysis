import { z } from "zod";

export const prismaAgentResultSchema = z.object({
  phase2: z.object({
    zielgruppeSek2: z.enum(["Ja", "Nein"]),
    massnahmeFuerSchule: z.enum(["Ja", "Nein"]),
    stressbewaeltigungOderResilienz: z.enum(["Ja", "Nein"]),
    entscheidung: z.enum(["eingeschlossen", "ausgeschlossen"]),
  }),
  phase3: z.object({
    theoriebasiert: z.enum(["erfüllt", "nicht erfüllt"]),
    evaluationsberichtVorhanden: z.enum(["erfüllt", "nicht erfüllt"]),
    transparentDokumentiert: z.enum(["erfüllt", "nicht erfüllt"]),
    transferierbarkeitOesterreich: z.enum(["erfüllt", "nicht erfüllt"]),
    niederschwelligerZugang: z.enum(["erfüllt", "nicht erfüllt"]),
  }),
  confidence: z.enum(["hoch", "mittel", "niedrig"]),
  finalDecision: z.enum(["Einschluss", "Ausschluss"]).optional(),
  begruendung: z.string().min(1),
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
