// Domipack — /api/applications
// GET (admin) : liste les candidatures avec pagination + filtres
// POST (public) : crée une nouvelle candidature depuis la landing

import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import { sendApplicationNotification } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { NextRequest } from "next/server";

// ============================================================
// Auth simple par API key (legacy — préférer NextAuth via /api/admin/*).
// Comparaison timing-safe pour éviter les timing attacks sur l'API key.
// ============================================================

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAuthenticated(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !apiKey) return false;
  return safeEqual(apiKey, expected);
}

// ============================================================
// GET — Admin : liste paginée + filtre par statut
// ============================================================

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  const { searchParams } = new URL(request.url);
  // Filtre par `pipe` (nouveau schéma CRM) — `status` reste accepté comme
  // alias legacy pour ne pas casser d'éventuels clients existants.
  const pipeRaw = searchParams.get("pipe") ?? searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const where = pipeRaw ? { pipe: pipeRaw as never } : {};

  try {
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          notes: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return apiSuccess({
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[api] Erreur liste candidatures:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}

// ============================================================
// POST — Public : crée une candidature
// ============================================================

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = createApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return apiZodError(parsed.error);
  }

  const { firstName, lastName, email, phone, postalCode, message, city, country, language, address } = parsed.data;

  try {
    const application = await prisma.application.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        postalCode,
        message: message || null,
        city: city || null,
        country: country || null,
        language,
        address: address || null,
        // pipe, source, relanceCount/Max prennent leurs valeurs par défaut du schéma
      },
    });

    // Notification email (non bloquant — on log si ça échoue)
    sendApplicationNotification(application).catch((err) => {
      console.error("[email] Échec notification candidature:", err);
    });

    // Notification in-app (cloche admin)
    createNotification({
      kind: "info",
      title: "Nouvelle candidature",
      body: `${firstName} ${lastName} — ${city || postalCode || "zone inconnue"}`,
      link: "candidats",
    }).catch(() => {});

    return apiSuccess(
      {
        id: application.id,
        status: "received",
        message: "Candidature reçue. Nous vous recontactons sous 48h.",
      },
      201
    );
  } catch (err) {
    console.error("[api] Erreur création candidature:", err);
    return apiError("Erreur lors de l'enregistrement", "INTERNAL_ERROR", 500);
  }
}
