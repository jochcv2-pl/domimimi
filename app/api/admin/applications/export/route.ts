import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

/**
 * GET /api/admin/applications/export
 *
 * Export CSV de toutes les candidatures (avec filtres optionnels).
 * Protégé : requiert session NextAuth + rôle ADMIN/SUPER_ADMIN.
 *
 * Query params (optionnels) :
 *   ?pipe=nouveau     — filtre par pipe
 *   ?source=...       — filtre exact sur la source
 *
 * Réponse : text/csv avec Content-Disposition attachment.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  const { searchParams } = new URL(request.url);
  const pipe = searchParams.get("pipe") || undefined;
  const source = searchParams.get("source") || undefined;

  const where: Record<string, unknown> = {};
  if (pipe) where.pipe = pipe;
  if (source) where.source = source;

  try {
    const applications = await prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        validatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    // ============================================================
    // Génération CSV (RFC 4180 — escape des guillemets et virgules)
    // ============================================================

    const headers = [
      "Date création",
      "Prénom",
      "Nom",
      "Email",
      "Téléphone",
      "Code postal",
      "Ville",
      "Zone",
      "Statut",
      "Source",
      "Date validation",
      "Validé par",
    ];

    const escapeCsv = (val: unknown): string => {
      const str = val == null ? "" : String(val);
      // Si la valeur contient une virgule, un guillemet ou un retour ligne,
      // l'entourer de guillemets et doubler les guillemets internes.
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = applications.map((app) =>
      [
        app.createdAt.toISOString(),
        app.firstName,
        app.lastName,
        app.email,
        app.phone ?? "",
        app.postalCode ?? "",
        app.city ?? "",
        app.zone ?? "",
        app.pipe,
        app.source ?? "",
        app.validatedAt?.toISOString() ?? "",
        app.validatedBy?.name ?? "",
      ]
        .map(escapeCsv)
        .join(","),
    );

    // BOM UTF-8 pour Excel (sinon les accents sont cassés à l'ouverture)
    const csv = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="candidatures-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[api/admin/applications/export] error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
