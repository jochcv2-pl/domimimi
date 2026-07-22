/**
 * Pipeline email — moteur (logique métier).
 *
 * Le moteur est pur : pas de HTTP, pas de NextRequest. Il est appelé
 * par l'endpoint `/api/cron/process-emails` (et pourrait l'être par
 * un worker Node si on change d'architecture).
 *
 * Cycle :
 *   1. Charger les settings (pause, provider, cadence, contact, cms)
 *   2. Si pause=true → retourner immédiatement (paused, 0 envoyés)
 *   3. Compter les envois du jour → si >= daily_cap → stop
 *   4. Pour chaque étape du flow (accueil, mission, relance_1/2/3) :
 *        a. Sélectionner les candidats éligibles (createdAt + délai atteint,
 *           pas encore traités pour ce trigger, stop conditions non remplies)
 *        b. Pour chaque candidat :
 *             - rendre le template
 *             - envoyer via le provider actif
 *             - écrire EmailLog (sent/failed/skipped)
 *             - attendre l'intervalle aléatoire (mini/maxi) si envoi réel
 *   5. Retourner un récap { processed, sent, failed, skipped, errors }
 *
 * Stop conditions (décision `crm.relance.stop_conditions`) :
 *   - relanceStop != null (STOP, bounce, exclusion admin…)
 *   - pipe = client (validé emballeur)
 *   - relanceCount >= relanceMax (3 relances atteintes)
 *   - createdAt > validation_window_days (10j) → skip définitif
 */

import { prisma } from "@/lib/prisma";
import { getProvider, setDbCredentials, type EmailProviderName } from "@/lib/email/providers";
import { renderEmail } from "@/lib/email/render";
import type { Application, PipeStatus, RelanceStop } from "@prisma/client";

// ============================================================
// Définition des étapes du flow
// ============================================================

export interface FlowStep {
  triggerKey: string;
  /** Délai (ms) depuis createdAt avant que l'étape ne devienne éligible. */
  delayMs: number;
  /** Ne s'applique qu'à ces pipes. undefined = tous. */
  pipes?: PipeStatus[];
  /** Indique si cette étape incrémente relanceCount. */
  incrementsRelance?: boolean;
}

const ONE_MIN = 60_000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;

export const FLOW_STEPS: FlowStep[] = [
  // T+5 min : Agent Accueil accusé réception
  {
    triggerKey: "accueil",
    delayMs: 5 * ONE_MIN,
  },
  // T+4 h : Agent Mission (offre + boutons contact)
  {
    triggerKey: "mission",
    delayMs: 4 * ONE_HOUR,
  },
  // J+3 : Agent Relance #1
  {
    triggerKey: "relance_1",
    delayMs: 3 * ONE_DAY,
    incrementsRelance: true,
  },
  // J+6 : Agent Relance #2
  {
    triggerKey: "relance_2",
    delayMs: 6 * ONE_DAY,
    incrementsRelance: true,
  },
  // J+9 : Agent Relance #3 (dernière)
  {
    triggerKey: "relance_3",
    delayMs: 9 * ONE_DAY,
    incrementsRelance: true,
  },
];

// ============================================================
// Settings chargés en début de cycle
// ============================================================

export interface PipelineSettings {
  paused: boolean;
  providerName: EmailProviderName;
  fromAddress: string;
  dailyCap: number;
  intervalMinSec: number;
  intervalMaxSec: number;
  warmupEnabled: boolean;
  /** Toutes les settings (pour render des templates : contact.*, cms.*). */
  raw: Record<string, string>;
}

export async function loadPipelineSettings(): Promise<PipelineSettings> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of rows) map[s.key] = s.value;

  // Injecter les credentials DB dans les providers (CMS > .env)
  setDbCredentials(map);

  const providerName = (map["email.provider_active"] ?? "resend") as EmailProviderName;
  const dailyCap = parseIntOr(map["email.cadence.daily_cap"], 200);
  const intervalMinSec = parseIntOr(map["pipeline.send_interval_min"], 30);
  const intervalMaxSec = parseIntOr(map["pipeline.send_interval_max"], 90);

  return {
    paused: map["pipeline.paused"] === "true",
    providerName,
    fromAddress: map["email.fromAddress"] ?? "recrutement@domipack.fr",
    dailyCap,
    intervalMinSec: Math.min(intervalMinSec, intervalMaxSec),
    intervalMaxSec: Math.max(intervalMinSec, intervalMaxSec),
    warmupEnabled: map["pipeline.warmup_enabled"] === "true",
    raw: map,
  };
}

function parseIntOr(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

// ============================================================
// Stop conditions
// ============================================================

const PERMANENT_STOPS: RelanceStop[] = [
  "stop",
  "bounce",
  "exclusion",
];

/**
 * Vrai si le candidat ne doit plus jamais recevoir d'emails pipeline
 * (quel que soit le trigger). Couvre stop conditions persistantes.
 */
export function isPermanentlyStopped(app: Pick<Application, "relanceStop" | "pipe">): boolean {
  if (app.relanceStop && PERMANENT_STOPS.includes(app.relanceStop)) return true;
  // pipe=client signifie candidat validé → pipeline terminé
  if (app.pipe === "client") return true;
  // pipe=perdu → exclu
  if (app.pipe === "perdu") return true;
  return false;
}

/**
 * Vrai si le trigger relance est bloqué par la règle max_count.
 */
export function isRelanceCapped(app: Pick<Application, "relanceCount" | "relanceMax">): boolean {
  return app.relanceCount >= app.relanceMax;
}

// ============================================================
// Sélection des candidats éligibles pour une étape
// ============================================================

export interface EligibleApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  postalCode: string;
  city: string | null;
  zone: string | null;
  pipe: PipeStatus;
  relanceStop: RelanceStop | null;
  relanceCount: number;
  relanceMax: number;
  createdAt: Date;
}

/**
 * Sélectionne les candidats qui doivent recevoir le trigger donné maintenant.
 *
 *   - createdAt + delayMs <= now (l'heure est venue)
 *   - pas déjà d'EmailLog (status: sent) pour ce (applicationId, trigger)
 *   - pas isPermanentlyStopped (sauf trigger="accueil" qui passe toujours)
 *   - si trigger commence par "relance_" : pas isRelanceCapped
 */
export async function selectEligible(
  step: FlowStep,
  now: Date,
  limit: number,
): Promise<EligibleApplication[]> {
  const threshold = new Date(now.getTime() - step.delayMs);

  // Candidats dont l'heure est venue et qui ne sont pas arrêtés
  // (le filtre relance est appliqué en JS car conditionnel au trigger).
  const apps = await prisma.application.findMany({
    where: {
      createdAt: { lte: threshold },
      // Exclure ceux qui ont déjà un EmailLog "sent" pour ce trigger
      emails: {
        none: {
          trigger: step.triggerKey,
          status: "sent",
        },
      },
      // Exclure les stops permanents (NULL doit passer — piège SQL NOT IN)
      OR: [
        { relanceStop: { notIn: PERMANENT_STOPS } },
        { relanceStop: null },
      ],
      pipe: { notIn: ["client", "perdu"] as PipeStatus[] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  // Filtre relance : si trigger est une relance, vérifier le cap
  if (step.triggerKey.startsWith("relance_")) {
    return apps.filter((a) => !isRelanceCapped(a));
  }

  return apps;
}

// ============================================================
// Helper : attendre un intervalle aléatoire
// ============================================================

export function randomDelayMs(minSec: number, maxSec: number): number {
  const span = Math.max(maxSec - minSec, 0);
  const sec = minSec + Math.random() * span;
  return Math.round(sec * 1000);
}

// ============================================================
// Résultat d'un cycle
// ============================================================

export interface CycleResult {
  paused: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ applicationId: string; email: string; trigger: string; error: string }>;
  /** ms total d'exécution du cycle (hors pause initiale). */
  durationMs: number;
  /** Raison d'arrêt anticipé éventuelle. */
  stoppedReason?: "paused" | "daily_cap_reached" | "provider_not_configured";
}

// ============================================================
// Cycle principal
// ============================================================

export interface CycleOptions {
  /** Nombre max de candidats traités par étape (sécurité anti-dérive). */
  perStepLimit?: number;
  /** Si true, n'envoie pas réellement (dry-run) — utile pour les tests. */
  dryRun?: boolean;
  /** Override du now (tests). */
  now?: Date;
}

export async function runEmailCycle(opts: CycleOptions = {}): Promise<CycleResult> {
  const now = opts.now ?? new Date();
  const startedAt = Date.now();
  const perStepLimit = Math.max(opts.perStepLimit ?? 50, 1);

  const result: CycleResult = {
    paused: false,
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  const settings = await loadPipelineSettings();

  if (settings.paused) {
    result.paused = true;
    result.stoppedReason = "paused";
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // Compter les envois déjà effectués aujourd'hui (minuit local)
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const sentToday = await prisma.emailLog.count({
    where: { status: "sent", createdAt: { gte: startOfDay } },
  });

  let remainingQuota = Math.max(settings.dailyCap - sentToday, 0);
  if (remainingQuota === 0) {
    result.stoppedReason = "daily_cap_reached";
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // Préparer le provider
  const provider = getProvider(settings.providerName);
  if (!provider.isConfigured()) {
    result.stoppedReason = "provider_not_configured";
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // Parcours des étapes dans l'ordre
  for (const step of FLOW_STEPS) {
    if (remainingQuota <= 0) break;
    const limit = Math.min(perStepLimit, remainingQuota);
    const eligible = await selectEligible(step, now, limit);

    for (const app of eligible) {
      if (remainingQuota <= 0) break;
      result.processed++;

      // Rendre le template
      const rendered = await renderEmail({
        triggerKey: step.triggerKey,
        application: app,
        settings: settings.raw,
      });

      if (!rendered.ok) {
        // Template manquant ou inactif → skip silencieux (pas une erreur candidat)
        result.skipped++;
        // Écrire un EmailLog skipped pour ne pas re-sélectionner le candidat
        // à chaque cycle. On l'écrit seulement si le template existe mais
        // est inactif ; si le template n'existe pas, on skip sans log
        // (sinon on remplirait la DB de logs pour un trigger non implémenté).
        if (rendered.reason === "template_inactive") {
          await prisma.emailLog.create({
            data: {
              applicationId: app.id,
              trigger: step.triggerKey,
              templateName: `(${step.triggerKey} inactif)`,
              toEmail: app.email,
              provider: settings.providerName,
              status: "skipped",
              error: "Template inactif",
            },
          });
        }
        continue;
      }

      // Dry-run : on simule sans envoyer ni logger
      if (opts.dryRun) {
        result.sent++;
        remainingQuota--;
        continue;
      }

      // Envoi réel
      const sendResult = await provider.send({
        to: app.email,
        from: settings.fromAddress,
        subject: rendered.content.subject,
        html: rendered.content.html,
        text: rendered.content.text,
      });

      if (sendResult.ok) {
        await prisma.emailLog.create({
          data: {
            applicationId: app.id,
            trigger: step.triggerKey,
            templateName: rendered.template.name,
            toEmail: app.email,
            provider: settings.providerName,
            status: "sent",
            providerMessageId: sendResult.messageId ?? null,
            sentAt: new Date(),
          },
        });
        // Incrémenter relanceCount si étape de relance
        if (step.incrementsRelance) {
          await prisma.application.update({
            where: { id: app.id },
            data: { relanceCount: { increment: 1 } },
          });
        }
        result.sent++;
        remainingQuota--;
      } else {
        await prisma.emailLog.create({
          data: {
            applicationId: app.id,
            trigger: step.triggerKey,
            templateName: rendered.template.name,
            toEmail: app.email,
            provider: settings.providerName,
            status: "failed",
            error: sendResult.error,
          },
        });
        result.failed++;
        result.errors.push({
          applicationId: app.id,
          email: app.email,
          trigger: step.triggerKey,
          error: sendResult.error,
        });
      }

      // Délai aléatoire entre les envois (jamais après le dernier)
      if (remainingQuota > 0) {
        const delay = randomDelayMs(settings.intervalMinSec, settings.intervalMaxSec);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}
