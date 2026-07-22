// Domipack — Route API : Déclenchement manuel du pipeline
//
// POST /api/admin/pipeline/run
// Déclenche un cycle d'envoi d'emails immédiatement.
// Permet de tester l'envoi sans attendre le cron externe.
//
// Body optionnel : { dryRun?: boolean, perStepLimit?: number }
//
// Protégé : session NextAuth + ADMIN/SUPER_ADMIN.

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { runEmailCycle } from "@/lib/email/engine";
import { apiSuccess, apiError } from "@/lib/api";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  let body: { dryRun?: boolean; perStepLimit?: number } = {};
  try {
    body = await request.json();
  } catch {
    // body vide = valeurs par défaut
  }

  try {
    const result = await runEmailCycle({
      dryRun: body.dryRun ?? false,
      perStepLimit: body.perStepLimit ?? 50,
    });

    return apiSuccess({ data: result });
  } catch (err) {
    console.error("[api/admin/pipeline/run] error:", err);
    return apiError("Erreur lors du cycle", "INTERNAL_ERROR", 500);
  }
}
