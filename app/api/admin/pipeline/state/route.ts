import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";
import { FLOW_STEPS, isPermanentlyStopped, isRelanceCapped } from "@/lib/email/engine";

/**
 * GET /api/admin/pipeline/state
 *
 * Renvoie un snapshot complet pour la vue Pipeline :
 *   - paused      : boolean (setting pipeline.paused)
 *   - provider    : nom + configured
 *   - dailyCap    : setting email.cadence.daily_cap
 *   - sentToday   : nombre d'envois sent aujourd'hui
 *   - queue       : candidats éligibles par étape (calcul à la volée)
 *   - recentLogs  : 30 derniers EmailLog (tous statuts)
 *
 * Protégé : session NextAuth + ADMIN/SUPER_ADMIN.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function GET(_request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [settingsRows, sentToday, recentLogs] = await Promise.all([
      prisma.setting.findMany(),
      prisma.emailLog.count({
        where: { status: "sent", createdAt: { gte: startOfDay } },
      }),
      prisma.emailLog.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          application: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    const settings: Record<string, string> = {};
    for (const s of settingsRows) settings[s.key] = s.value;

    // Construire la file d'attente par étape
    const queue: Array<{
      triggerKey: string;
      label: string;
      delayLabel: string;
      eligibleCount: number;
      nextUp: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        createdAt: string;
      }>;
    }> = [];

    for (const step of FLOW_STEPS) {
      const threshold = new Date(now.getTime() - step.delayMs);
      // Candidats dont l'heure est venue et pas encore envoyés pour ce trigger
      const eligible = await prisma.application.findMany({
        where: {
          createdAt: { lte: threshold },
          emails: {
            none: { trigger: step.triggerKey, status: "sent" },
          },
          relanceStop: { notIn: ["stop", "bounce", "exclusion"] },
          pipe: { notIn: ["client", "perdu"] },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          relanceCount: true,
          relanceMax: true,
          pipe: true,
          relanceStop: true,
        },
      });

      const filtered = eligible.filter((a) => {
        if (step.triggerKey.startsWith("relance_") && isRelanceCapped(a)) return false;
        if (isPermanentlyStopped(a)) return false;
        return true;
      });

      queue.push({
        triggerKey: step.triggerKey,
        label: labelForStep(step.triggerKey),
        delayLabel: delayLabel(step.delayMs),
        eligibleCount: filtered.length,
        nextUp: filtered.slice(0, 5).map((a) => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    }

    return apiSuccess({
      data: {
        paused: settings["pipeline.paused"] === "true",
        provider: settings["email.provider_active"] ?? "resend",
        dailyCap: Number.parseInt(settings["email.cadence.daily_cap"] ?? "200", 10),
        sentToday,
        queue,
        recentLogs: recentLogs.map((l) => ({
          id: l.id,
          applicationId: l.applicationId,
          trigger: l.trigger,
          templateName: l.templateName,
          toEmail: l.toEmail,
          provider: l.provider,
          status: l.status,
          error: l.error,
          createdAt: l.createdAt.toISOString(),
          sentAt: l.sentAt?.toISOString() ?? null,
          candidate: l.application
            ? {
                firstName: l.application.firstName,
                lastName: l.application.lastName,
                email: l.application.email,
              }
            : null,
        })),
      },
    });
  } catch (err) {
    console.error("[api/admin/pipeline/state] error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}

function labelForStep(key: string): string {
  switch (key) {
    case "accueil":
      return "Agent Accueil · accusé de réception";
    case "mission":
      return "Agent Mission · offre de recrutement";
    case "relance_1":
      return "Agent Relance #1 · J+3";
    case "relance_2":
      return "Agent Relance #2 · J+6";
    case "relance_3":
      return "Agent Relance #3 · J+9 (dernière)";
    default:
      return key;
  }
}

function delayLabel(ms: number): string {
  if (ms < 60_000) return `T+${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `T+${Math.round(ms / 60_000)}min`;
  if (ms < 86_400_000) return `T+${Math.round(ms / 3_600_000)}h`;
  return `J+${Math.round(ms / 86_400_000)}`;
}
