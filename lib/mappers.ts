// Domipack — Mappers
//
// Convertit les entités Prisma en formes consommables par l'UI CRM.
// Centralise le mappage pour qu'un changement de schéma n'impacte
// qu'un seul fichier.

import type { Application } from "@prisma/client";

// Format court d'une date ISO pour l'affichage CRM (ex : "15 juil.").
export function formatShortDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Helper toISO qui tolère Date OU string (les réponses API fetch JSON
// sérialisent les Date en string ISO ; les objets Prisma gardent des Date).
// Renvoie null si l'entrée est null/undefined ou invalide.
function toIso(input: Date | string | null | undefined): string | null {
  if (input == null) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Initiales à partir d'un prénom+nom (max 2 lettres).
export function buildInitials(firstName: string, lastName: string): string {
  const f = (firstName?.[0] ?? "").toUpperCase();
  const l = (lastName?.[0] ?? "").toUpperCase();
  return `${f}${l}` || "??";
}

// Temps relatif en français ("il y a 2 h", "hier", "15 juil.").
export function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "hier";
  if (diffD < 7) return `il y a ${diffD} j`;
  return formatShortDate(d);
}

// Objet UI pour la table candidats.
// Note : le type Contact est volontairement aligné avec l'ancienne forme mock
// pour minimiser le refactor de CandidatsView, mais la source est désormais la DB.
export type UiContact = {
  id: string;
  ini: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  postalCode: string;
  city: string | null;
  zone: string | null;
  source: string;
  recu: string;
  createdAt: string;
  relances: { on: number; total: number } | "valide";
  pipe: Application["pipe"];
  relanceCount: number;
  relanceMax: number;
  relanceStop: Application["relanceStop"];
  message: string | null;
  validatedAt: string | null;
  validatedBy: { name: string | null; email: string } | null;
};

// Le paramètre `app` peut venir de Prisma (Date) OU d'un fetch JSON (string).
// On tolère les deux via les helpers `toIso` / `timeAgo` qui font la conversion.
// Les champs mission (product, payMode, weeklyPackages, startDate) sont optionnels
// car ils ne sont renseignés qu'au moment de la validation emballeur (pipe=client).
type MapperInput = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  postalCode: string;
  city: string | null;
  zone: string | null;
  source: string;
  createdAt: Date | string;
  pipe: Application["pipe"];
  relanceCount: number;
  relanceMax: number;
  relanceStop: Application["relanceStop"];
  message: string | null;
  validatedAt: Date | string | null;
  validatedBy?: { name: string | null; email: string } | null;
  // Champs mission (pipe=client uniquement, sinon null)
  product?: string | null;
  payMode?: "hourly" | "package" | null;
  weeklyPackages?: number | null;
  startDate?: Date | string | null;
};

export function applicationToUiContact(app: MapperInput): UiContact {
  const valide = app.pipe === "client" || app.relanceStop === "valide";
  return {
    id: app.id,
    ini: buildInitials(app.firstName, app.lastName),
    name: `${app.firstName} ${app.lastName}`,
    firstName: app.firstName,
    lastName: app.lastName,
    email: app.email,
    phone: app.phone,
    postalCode: app.postalCode,
    city: app.city,
    zone: app.zone,
    source: app.source,
    recu: timeAgo(app.createdAt),
    createdAt: toIso(app.createdAt) ?? new Date().toISOString(),
    relances: valide
      ? "valide"
      : { on: app.relanceCount, total: app.relanceMax },
    pipe: app.pipe,
    relanceCount: app.relanceCount,
    relanceMax: app.relanceMax,
    relanceStop: app.relanceStop,
    message: app.message,
    validatedAt: toIso(app.validatedAt),
    validatedBy: app.validatedBy ?? null,
  };
}
