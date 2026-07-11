import { AuthStorage, createAgentSession, ModelRegistry, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { prismaAgentResultSchema } from "./schema.js";
import { buildPrismaPrompt } from "./prompts.js";
import type { EvidenceDocument, ManualReviewStatus, PrismaAgentResult, PrismaRowInput } from "./types.js";

export interface PrismaAnalysisOptions {
  requestedModel?: string;
  timeoutMs?: number;
  verbose?: boolean;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object found in model output: ${text.slice(0, 500)}`);
  return match[0];
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function normalizeManualReview(value: unknown, fallback: ManualReviewStatus = "Ja"): ManualReviewStatus {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["ja", "j", "yes", "y", "true", "1"].includes(normalized)) return "Ja";
  if (["nein", "n", "no", "false", "0"].includes(normalized)) return "Nein";
  return fallback;
}

function normalizeAgentResult(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const result = raw as Record<string, unknown>;
  result.phase2ManualReview = normalizeManualReview(result.phase2ManualReview, "Ja");
  result.phase3ManualReview = normalizeManualReview(result.phase3ManualReview, "Ja");
  result.berichtManuellSuchen = normalizeManualReview(result.berichtManuellSuchen, "Ja");
  result.manualReview = normalizeManualReview(
    result.manualReview,
    result.phase2ManualReview === "Ja" || result.phase3ManualReview === "Ja" || result.berichtManuellSuchen === "Ja" ? "Ja" : "Nein",
  );
  return result;
}

async function resolveModel(requested?: string) {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const models = await modelRegistry.getAvailable();
  if (models.length === 0) throw new Error("No pi models available. Configure ~/.pi/agent/auth.json or provider API keys.");

  const model = requested
    ? models.find((entry) => `${entry.provider}/${entry.id}` === requested || entry.id === requested)
    : models[0];

  if (!model) throw new Error(`Requested model not found: ${requested}`);
  return { authStorage, modelRegistry, model };
}

export async function runPrismaAnalysis(
  row: PrismaRowInput,
  evidence: EvidenceDocument[],
  options: PrismaAnalysisOptions = {},
): Promise<PrismaAgentResult> {
  const { requestedModel, verbose = false } = options;
  const timeoutMs = options.timeoutMs ?? Number(process.env.PRISMA_PI_TIMEOUT_MS ?? 300000);
  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
  });
  const { authStorage, modelRegistry, model } = await resolveModel(requestedModel ?? process.env.PRISMA_PI_MODEL);
  console.log(`  using model: ${model.provider}/${model.id}`);

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    model,
    authStorage,
    modelRegistry,
    tools: [],
    sessionManager: SessionManager.inMemory(process.cwd()),
    settingsManager,
  });

  try {
    let output = "";
    let deltaCount = 0;
    let lastProgressLog = Date.now();
    if (verbose) {
      console.log(`  agent prompt started (${evidence.length} evidence docs, timeout=${timeoutMs}ms)`);
    }
    session.subscribe((event) => {
      if (verbose) {
        console.log(`  [agent event] ${event.type}`);
      }
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        output += event.assistantMessageEvent.delta;
        deltaCount += 1;
        if (verbose) {
          process.stdout.write(event.assistantMessageEvent.delta);
        } else if (Date.now() - lastProgressLog >= 10000) {
          console.log(`  agent still running... received ${output.length} chars in ${deltaCount} delta(s)`);
          lastProgressLog = Date.now();
        }
      }
      if (event.type === "agent_end") {
        if (verbose && output && !output.endsWith("\n")) {
          process.stdout.write("\n");
        }
        console.log("  agent finished");
      }
    });

    await withTimeout(session.prompt(buildPrismaPrompt(row, evidence)), timeoutMs, "pi analysis");
    const parsed = normalizeAgentResult(JSON.parse(extractJson(output)));
    return prismaAgentResultSchema.parse(parsed);
  } finally {
    session.dispose();
  }
}
