import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * GET /api/pay-rates
 *
 * Route PUBLIQUE (pas d'auth) qui renvoie la grille de rémunération ACTIVE
 * pour affichage sur la landing page (ProfilePay). Les taux désactivés
 * (active=false) sont exclus.
 *
 * Le frontend landing prend typiquement le taux horaire minimum pour
 * afficher "Dès X €/h".
 *
 * Mise en cache : 60s côté Next.js, 60s côté client (Cache-Control).
 */
export const revalidate = 60;

function payRateToJson(r: {
  id: string;
  type: string;
  mode: string | null;
  label: string;
  amount: { toString(): string };
  unit: string;
}) {
  return {
    type: r.type,
    mode: r.mode,
    label: r.label,
    amount: Number(r.amount.toString()),
    unit: r.unit,
  };
}

export async function GET() {
  try {
    const rates = await prisma.payRate.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { sort: "asc" }],
      select: {
        id: true,
        type: true,
        mode: true,
        label: true,
        amount: true,
        unit: true,
      },
    });

    return apiSuccess(
      { rates: rates.map(payRateToJson) },
      200
    );
  } catch (err) {
    console.error("[api/pay-rates] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
