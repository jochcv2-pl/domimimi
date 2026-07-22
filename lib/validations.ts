// Domipack — Schémas de validation Zod
// Toutes les entrées utilisateur sont validées côté serveur

import { z } from "zod";

// ============================================================
// Application (candidature)
// ============================================================

export const createApplicationSchema = z.object({
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .max(50, "Le prénom est trop long"),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .max(50, "Le nom est trop long"),
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide"),
  phone: z
    .string()
    .max(20, "Le numéro est trop long")
    .optional()
    .or(z.literal("")),
  postalCode: z
    .string()
    .min(1, "Le code postal est requis")
    .max(10, "Le code postal est trop long")
    .regex(/^[0-9A-Za-z\s-]+$/, "Code postal invalide"),
  message: z
    .string()
    .max(2000, "Le message est trop long")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "La ville est trop longue")
    .optional()
    .or(z.literal("")),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

// ============================================================
// Pipeline CRM — schémas pour les updates admin
// ============================================================

export const PIPE_VALUES = [
  "nouveau",
  "contacte",
  "encours",
  "offre",
  "attente",
  "client",
  "perdu",
] as const;

export const RELANCE_STOP_VALUES = [
  "valide",
  "stop",
  "bounce",
  "exclusion",
  "sansreponse",
] as const;

export const PAY_MODE_VALUES = ["hourly", "package"] as const;
export const PAY_RATE_TYPE_VALUES = ["base", "zone"] as const;

// Update partiel d'une candidature côté admin CRM.
export const updateApplicationSchema = z
  .object({
    pipe: z.enum(PIPE_VALUES).optional(),
    city: z.string().max(100).optional().nullable(),
    zone: z.string().max(100).optional().nullable(),
    source: z.string().max(100).optional(),
    relanceCount: z.number().int().min(0).max(10).optional(),
    relanceMax: z.number().int().min(0).max(10).optional(),
    relanceStop: z.enum(RELANCE_STOP_VALUES).optional().nullable(),
    // Champs mission (renseignés au moment de la validation emballeur)
    product: z.string().max(100).optional().nullable(),
    payMode: z.enum(PAY_MODE_VALUES).optional().nullable(),
    weeklyPackages: z.number().int().min(0).max(10000).optional().nullable(),
    startDate: z.coerce.date().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ doit être fourni",
  });

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

// ============================================================
// PayRate — grille de rémunération
// ============================================================

export const updatePayRateSchema = z.object({
  id: z.string(),
  amount: z
    .number({ message: "Montant invalide" })
    .min(0, "Le montant doit être positif")
    .max(1000, "Le montant est trop élevé"),
  label: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  note: z.string().max(50).optional().nullable(),
  active: z.boolean().optional(),
});

export const bulkUpdatePayRatesSchema = z.object({
  rates: z.array(updatePayRateSchema).min(1, "Au moins un taux requis"),
});

export type UpdatePayRateInput = z.infer<typeof updatePayRateSchema>;
export type BulkUpdatePayRatesInput = z.infer<typeof bulkUpdatePayRatesSchema>;

// ============================================================
// EmailTemplate — modèles d'emails agents
// ============================================================

export const EMAIL_TEMPLATE_STATUS = ["actif", "brouillon", "archive"] as const;

export const updateEmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  trigger: z.string().max(200).optional(),
  agentKey: z.string().max(50).optional().nullable(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  status: z.enum(EMAIL_TEMPLATE_STATUS).optional(),
  sort: z.number().int().min(0).max(1000).optional(),
});

export const bulkUpdateEmailTemplatesSchema = z.object({
  templates: z.array(updateEmailTemplateSchema).min(1),
});

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;

// Création d'un nouveau template
export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  trigger: z.string().max(200).default("Envoi manuel · —"),
  agentKey: z.string().max(50).optional().nullable(),
  subject: z.string().min(1, "L'objet est requis").max(200),
  body: z.string().min(1, "Le corps est requis").max(10000),
  status: z.enum(EMAIL_TEMPLATE_STATUS).default("brouillon"),
});
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;

// ============================================================
// Agent — configuration des agents IA
// ============================================================

export const updateAgentSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  desc: z.string().max(500).optional(),
  subrole: z.string().max(200).optional(),
  avatar: z.string().max(4).optional(),
  prompt: z.string().max(20000).optional(),
  memory: z.array(z.object({
    key: z.string().min(1).max(100),
    val: z.string().min(1).max(1000),
  })).optional(),
  active: z.boolean().optional(),
  sort: z.number().int().min(0).max(1000).optional(),
});

export const bulkUpdateAgentsSchema = z.object({
  agents: z.array(updateAgentSchema).min(1),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// Création d'un agent
export const createAgentSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  desc: z.string().max(500).optional().nullable(),
  subrole: z.string().max(200).optional().nullable(),
});
export type CreateAgentInput = z.infer<typeof createAgentSchema>;

// ============================================================
// Settings — clé/valeur (WhatsApp/Messenger/footer…)
// ============================================================

export const updateSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(5000),
});

export const bulkUpdateSettingsSchema = z.object({
  settings: z.array(updateSettingSchema).min(1),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

// --- SeoAudit ------------------------------------------------------------
// Un audit est immuable une fois créé (snapshot). La validation garantit
// l'intégrité du score (0-100) et des items (label + detail + ok obligatoires).

export const seoAuditItemSchema = z.object({
  label: z.string().min(1).max(120),
  detail: z.string().min(1).max(280),
  ok: z.boolean(),
});

export const createSeoAuditSchema = z.object({
  score: z.number().int().min(0).max(100),
  items: z.array(seoAuditItemSchema).min(1),
  suggestions: z.string().min(1).max(2000),
});

export type CreateSeoAuditInput = z.infer<typeof createSeoAuditSchema>;
