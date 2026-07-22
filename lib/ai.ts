// Domipack — Client IA (server-side)
//
// Lit les settings ai.* depuis la DB (même pattern que lib/brand.ts).
// Appelle l'API OpenAI-compatible du moteur configuré (Ollama, vLLM, LMStudio…).
//
// Fallback silencieux : si l'IA n'est pas configurée ou injoignable,
// toutes les fonctions retournent null / lancent une AiError récupérable.
// Le CRM continue à fonctionner sans IA (templates statiques).

import { prisma } from "@/lib/prisma";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface AiSettings {
  endpoint: string;
  model: string;
  provider: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class AiError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_CONFIGURED"
      | "ENDPOINT_UNREACHABLE"
      | "MODEL_ERROR"
      | "TIMEOUT"
      | "PARSE_ERROR",
    public status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

// ──────────────────────────────────────────────
// Cache des settings (60s, identique à lib/brand.ts)
// ──────────────────────────────────────────────

let cache: { data: AiSettings; ts: number } | null = null;
const CACHE_TTL = 60_000;

const DEFAULTS: AiSettings = {
  endpoint: "http://localhost:11434",
  model: "qwen3:8b",
  provider: "ollama",
  apiKey: "",
  temperature: 0.3,
  maxTokens: 2048,
};

/**
 * Charge la config IA depuis la DB.
 * Fallback sur .env AI_API_KEY si le setting DB est vide.
 * Toujours retourner un objet valide.
 */
export async function getAiSettings(): Promise<AiSettings> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "ai.endpoint",
            "ai.model",
            "ai.provider",
            "ai.api_key",
            "ai.temperature",
            "ai.max_tokens",
          ],
        },
      },
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    // Fallback .env AI_API_KEY si le setting DB est vide
    const apiKey =
      map["ai.api_key"]?.trim() || process.env.AI_API_KEY?.trim() || "";

    const data: AiSettings = {
      endpoint: map["ai.endpoint"]?.trim() || DEFAULTS.endpoint,
      model: map["ai.model"]?.trim() || DEFAULTS.model,
      provider: map["ai.provider"]?.trim() || DEFAULTS.provider,
      apiKey,
      temperature: parseFloatOr(map["ai.temperature"], DEFAULTS.temperature),
      maxTokens: parseIntOr(map["ai.max_tokens"], DEFAULTS.maxTokens),
    };

    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return DEFAULTS;
  }
}

/**
 * Invalide le cache (utile après mise à jour des settings via CMS).
 */
export function invalidateAiCache(): void {
  cache = null;
}

// ──────────────────────────────────────────────
// Client HTTP — OpenAI-compatible /v1/chat/completions
// ──────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Appelle l'API chat/completions du moteur IA configuré.
 *
 * Compatible : Ollama, vLLM, LMStudio, OpenAI, Groq, etc.
 * Tous exposent /v1/chat/completions avec le même format.
 *
 * @throws AiError si l'endpoint est injoignable, timeout, ou réponse invalide.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts?: {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  },
): Promise<ChatResult> {
  const settings = await getAiSettings();

  const url = `${settings.endpoint.replace(/\/+$/, "")}/v1/chat/completions`;

  const body = {
    model: settings.model,
    messages,
    temperature: opts?.temperature ?? settings.temperature,
    max_tokens: opts?.maxTokens ?? settings.maxTokens,
    stream: false,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) {
    headers["Authorization"] = `Bearer ${settings.apiKey}`;
  }

  // Timeout via AbortController (complémentaire au signal passé par l'appelant)
  const timeoutCtl = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutCtl.abort(),
    REQUEST_TIMEOUT_MS,
  );

  // Combiner le signal externe avec le timeout
  const signal = opts?.signal
    ? mergeSignals(opts.signal, timeoutCtl.signal)
    : timeoutCtl.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AiError(
        `Délai dépassé (${REQUEST_TIMEOUT_MS}ms)`,
        "TIMEOUT",
      );
    }
    throw new AiError(
      `Endpoint injoignable : ${url}`,
      "ENDPOINT_UNREACHABLE",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(
      `Erreur ${res.status} du moteur IA${text ? `: ${text.slice(0, 300)}` : ""}`,
      "MODEL_ERROR",
      res.status,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new AiError("Réponse JSON invalide", "PARSE_ERROR");
  }

  const data = json as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new AiError("Réponse vide du modèle", "PARSE_ERROR");
  }

  return {
    content: content.trim(),
    model: data.model ?? settings.model,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

// ──────────────────────────────────────────────
// Test de connexion
// ──────────────────────────────────────────────

/**
 * Test rapide : envoie un prompt trivial et vérifie la réponse.
 * Utilisé par le bouton "Tester la connexion" du CMS.
 */
export async function testConnection(): Promise<{
  ok: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
  code?: string;
}> {
  try {
    const settings = await getAiSettings();
    const start = Date.now();

    const result = await chatCompletion(
      [
        {
          role: "user",
          content: "Réponds uniquement: OK",
        },
      ],
      { maxTokens: 5, temperature: 0 },
    );

    return {
      ok: true,
      model: result.model,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    if (err instanceof AiError) {
      return { ok: false, error: err.message, code: err.code };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
      code: "MODEL_ERROR",
    };
  }
}

// ──────────────────────────────────────────────
// Exécution d'agent
// ──────────────────────────────────────────────

/**
 * Charge un agent depuis la DB et génère une réponse IA contextualisée.
 *
 * @param agentKey  La clé de l'agent (ex: "accueil", "mission", "relance").
 * @param userMessage Le contexte métier (infos candidat, mission, etc.).
 * @returns Le contenu généré par l'IA, ou null si l'agent n'existe pas / est inactif.
 *
 * @throws AiError si l'IA est configurée mais injoignable.
 *         Le caller doit catcher et retomber sur le template statique.
 */
export async function runAgent(
  agentKey: string,
  userMessage: string,
): Promise<string | null> {
  const agent = await prisma.agent.findUnique({
    where: { key: agentKey },
    select: {
      prompt: true,
      memory: true,
      active: true,
      name: true,
    },
  });

  if (!agent || !agent.active) return null;

  // Construire le system prompt : instructions verrouillées + mémoire
  const memoryLines = formatMemory(agent.memory);
  const systemPrompt = [agent.prompt, memoryLines]
    .filter(Boolean)
    .join("\n\n--- Mémoire de l'agent ---\n");

  const result = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]);

  return result.content;
}

/**
 * Version "safe" de runAgent : ne lance jamais d'exception.
 * Retourne null si l'IA échoue (le caller retombe sur le template statique).
 *
 * Utiliser dans le moteur d'emails et tout flux de production.
 */
export async function runAgentSafe(
  agentKey: string,
  userMessage: string,
): Promise<string | null> {
  try {
    return await runAgent(agentKey, userMessage);
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Utilitaires
// ──────────────────────────────────────────────

function parseFloatOr(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntOr(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function formatMemory(memory: unknown): string {
  if (!memory || !Array.isArray(memory)) return "";
  const entries = memory as Array<{ key?: string; val?: string }>;
  if (entries.length === 0) return "";
  return entries
    .filter((e) => e.key && e.val)
    .map((e) => `- ${e.key}: ${e.val}`)
    .join("\n");
}

/**
 * Fusionne deux AbortSignals en un seul.
 * S'annule si l'un OU l'autre s'annule.
 */
function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  // Si déjà annulé
  if (a.aborted || b.aborted) ctl.abort();
  return ctl.signal;
}
