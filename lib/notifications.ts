/**
 * Helper pour créer des notifications persistantes en DB.
 *
 * Appelé depuis les routes API quand un événement important se produit :
 *   - Nouvelle candidature  → createNotification({ kind: "info", … })
 *   - Emballeur validé      → createNotification({ kind: "success", … })
 *   - Mission assignée      → createNotification({ kind: "success", … })
 *   - Relance sans réponse  → createNotification({ kind: "alert", … })
 *
 * Les notifications sont lues par GET /api/admin/notifications et
 * affichées dans la cloche du Topbar.
 *
 * Non bloquant : si l'insertion échoue, on log et on continue.
 */

import { prisma } from "@/lib/prisma";
import type { NotificationKind } from "@prisma/client";

export interface CreateNotificationInput {
  kind?: NotificationKind;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        kind: input.kind ?? "info",
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });
  } catch (err) {
    console.error("[notifications] Échec création:", err);
  }
}
