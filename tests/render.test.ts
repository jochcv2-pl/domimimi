import { describe, it, expect, vi } from "vitest";

// Mock Prisma — les fonctions testées (buildVars, substitute) sont pures
// et ne touchent pas la DB, mais le module render.ts importe prisma au
// top-level, ce qui déclenche une connexion DB en l'absence de mock.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildVars, substitute } from "@/lib/email/render";
import type { RenderContext } from "@/lib/email/render";

// ============================================================
// buildVars — construction du dictionnaire {{...}}
// ============================================================

const mockCtx: RenderContext = {
  application: {
    firstName: "Marie",
    lastName: "Dubois",
    email: "marie@example.fr",
    postalCode: "69001",
    city: "Lyon",
    zone: "Rhône-Alpes",
  },
  settings: {
    "remuneration.taux_horaire_min": "13.50",
    "cms.referent_prenom": "Sophie",
    "contact.whatsapp": "https://wa.me/123",
    "contact.messenger": "https://m.me/456",
  },
};

describe("buildVars", () => {
  it("mappe les champs candidat vers les vars françaises", () => {
    const vars = buildVars(mockCtx);
    expect(vars["Prénom"]).toBe("Marie");
    expect(vars["Nom"]).toBe("Dubois");
    expect(vars["Email"]).toBe("marie@example.fr");
    expect(vars["Ville"]).toBe("Lyon");
    expect(vars["Code postal"]).toBe("69001");
  });

  it("récupère les settings CMS", () => {
    const vars = buildVars(mockCtx);
    expect(vars["Taux horaire"]).toBe("13.50");
    expect(vars["Prénom du référent"]).toBe("Sophie");
    expect(vars["WhatsApp URL"]).toBe("https://wa.me/123");
  });

  it("fallback zone ← city ← postalCode (uniquement si null/undefined, pas vide)", () => {
    // Le ?? ne fallback que sur null/undefined, pas sur chaîne vide.
    // C'est volontaire : une zone vide est un cas métier valide.
    const vars = buildVars({
      application: { ...mockCtx.application, zone: undefined as unknown as string },
      settings: {},
    });
    expect(vars["Zone"]).toBe("Lyon");
  });

  it("zone vide reste vide (pas de fallback sur chaîne vide)", () => {
    const vars = buildVars({
      application: { ...mockCtx.application, zone: "" },
      settings: {},
    });
    expect(vars["Zone"]).toBe("");
  });

  it("référent par défaut 'Camille' si setting absent", () => {
    const vars = buildVars({
      application: mockCtx.application,
      settings: {},
    });
    expect(vars["Prénom du référent"]).toBe("Camille");
  });

  it("valeurs absentes → chaîne vide (sauf référent qui a un défaut)", () => {
    const vars = buildVars({
      application: {
        firstName: "",
        lastName: "",
        email: "",
        postalCode: "",
        city: "",
        zone: "",
      },
      settings: {},
    });
    // Le référent a une valeur par défaut "Camille", la marque a "domipackung"
    expect(vars["Prénom du référent"]).toBe("Camille");
    expect(vars["Nom de la marque"]).toBe("domipackung");
    // Toutes les autres doivent être ""
    const { "Prénom du référent": _omit, "Nom de la marque": _omit2, ...rest } = vars;
    for (const [key, v] of Object.entries(rest)) {
      expect(v, `${key} should be empty`).toBe("");
    }
  });
});

// ============================================================
// substitute — remplacement {{Var}} → valeur
// ============================================================

describe("substitute", () => {
  it("remplace les placeholders connus", () => {
    const { output } = substitute("Bonjour {{Prénom}} !", { Prénom: "Marie" });
    expect(output).toBe("Bonjour Marie !");
  });

  it("remplace plusieurs placeholders", () => {
    const { output } = substitute(
      "{{Prénom}} {{Nom}} — {{Ville}}",
      { Prénom: "Marie", Nom: "Dubois", Ville: "Lyon" },
    );
    expect(output).toBe("Marie Dubois — Lyon");
  });

  it("tolère les espaces autour du nom de var", () => {
    const { output } = substitute("Hi {{  Prénom  }}!", { Prénom: "Marie" });
    expect(output).toBe("Hi Marie!");
  });

  it("remplace les vars inconnues par chaîne vide", () => {
    const { output, unknownVars } = substitute("Hi {{Inconnue}}!", {
      Prénom: "Marie",
    });
    expect(output).toBe("Hi !");
    expect(unknownVars).toContain("Inconnue");
  });

  it("collecte les vars inconnues sans doublons", () => {
    const { unknownVars } = substitute(
      "{{X}} {{Y}} {{X}} {{Z}}",
      {},
    );
    expect(unknownVars.sort()).toEqual(["X", "Y", "Z"]);
  });

  it("retourne unknownVars vide si tout est connu", () => {
    const { unknownVars } = substitute("{{Prénom}}", { Prénom: "Marie" });
    expect(unknownVars).toEqual([]);
  });

  it("ne modifie pas une chaîne sans placeholders", () => {
    const { output } = substitute("Plain text", {});
    expect(output).toBe("Plain text");
  });
});
