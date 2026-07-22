"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";

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
  const t = useTranslations("apply");
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
          setErrorMessage(messages.join(" ") || t("error.invalidData"));
        } else {
          setErrorMessage(data.error || t("error.generic"));
        }
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage(t("error.network"));
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
            {t("eyebrow")}
          </span>
          <h2>{t("title")}</h2>
          <p>{t("intro")}</p>
        </Reveal>

        {isSuccess ? (
          <div className="form reveal in">
            <div style={{ gridColumn: "1/-1", padding: "24px 0" }}>
              <p style={{ fontSize: "1.1rem", color: "var(--honey)", display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="checkCircle" size={24} color="var(--honey)" />
                {t("success.thanksPrefix")} {form.firstName || t("success.fallbackName")} ! {t("success.message")}
              </p>
            </div>
          </div>
        ) : (
          <form className="form reveal" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder={t("placeholder.firstName")}
                aria-label={t("placeholder.firstName")}
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <input
                type="text"
                placeholder={t("placeholder.lastName")}
                aria-label={t("placeholder.lastName")}
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <input
                type="email"
                className="full"
                placeholder={t("placeholder.email")}
                aria-label={t("ariaLabel.email")}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <input
                type="tel"
                placeholder={t("placeholder.phone")}
                aria-label={t("placeholder.phone")}
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="text"
                placeholder={t("placeholder.postalCode")}
                aria-label={t("placeholder.postalCode")}
                value={form.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <textarea
                className="full"
                placeholder={t("placeholder.message")}
                aria-label={t("ariaLabel.message")}
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
                {isSubmitting ? t("button.submitting") : t("button.submit")}
              </button>
            </form>
        )}

      </div>
    </section>
  );
}
