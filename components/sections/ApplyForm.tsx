"use client";

import { useState, type FormEvent } from "react";
import Reveal from "@/components/ui/Reveal";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postalCode: string;
  message: string;
};

type Status = "idle" | "submitting" | "success" | "error";

const INITIAL_STATE: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  postalCode: "",
  message: "",
};

export default function ApplyForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // Erreur de validation Zod (422) ou autre
        if (data.details && Array.isArray(data.details)) {
          const messages = data.details
            .map((d: { message?: string }) => d.message)
            .filter(Boolean);
          setErrorMessage(messages.join(" ") || "Données invalides");
        } else {
          setErrorMessage(data.error || "Une erreur est survenue");
        }
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage("Connexion impossible. Réessayez dans un instant.");
      setStatus("error");
    }
  }

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <section className="apply" id="postuler">
      <div className="blob" />
      <div
        className="domipack-wrap"
        style={{ paddingTop: "84px", paddingBottom: "84px" }}
      >
        <Reveal>
          <span className="eyebrow" style={{ color: "var(--honey)" }}>
            Candidature
          </span>
          <h2>Prête à emballer depuis chez vous ?</h2>
          <p>
            Laissez vos coordonnées, on vous rappelle sous 48 h pour vous
            présenter la mission la plus proche de chez vous.
          </p>
        </Reveal>

        {isSuccess ? (
          <div className="form reveal in">
            <div style={{ gridColumn: "1/-1", padding: "24px 0" }}>
              <p style={{ fontSize: "1.1rem", color: "var(--honey)" }}>
                ✅ Merci {form.firstName || "à vous"} ! Votre candidature a bien été
                enregistrée. On vous recontacte sous 48 h.
              </p>
            </div>
          </div>
        ) : (
          <form className="form reveal" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Prénom"
                aria-label="Prénom"
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <input
                type="text"
                placeholder="Nom"
                aria-label="Nom"
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <input
                type="email"
                className="full"
                placeholder="Adresse e-mail"
                aria-label="E-mail"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <input
                type="tel"
                placeholder="Téléphone"
                aria-label="Téléphone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="text"
                placeholder="Code postal"
                aria-label="Code postal"
                value={form.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <textarea
                className="full"
                placeholder="Un mot sur vous (optionnel)"
                aria-label="Message"
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                rows={3}
                disabled={isSubmitting}
                style={{ resize: "vertical", fontFamily: "inherit", fontSize: "1rem", padding: "12px 14px" }}
              />
              {isError && errorMessage && (
                <p
                  className="full"
                  style={{
                    gridColumn: "1/-1",
                    color: "#FF9A9A",
                    fontSize: "0.9rem",
                    margin: 0,
                  }}
                >
                  {errorMessage}
                </p>
              )}
              <button
                type="submit"
                className="btn btn-primary full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Envoi en cours…" : "Envoyer ma candidature"}
              </button>
            </form>
        )}

      </div>
    </section>
  );
}
