"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Reveal from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postalCode: string;
  country: string;
  language: string;
  address: string;
  message: string;
};

type Status = "idle" | "submitting" | "success" | "error";

export default function ApplyForm() {
  const t = useTranslations("apply");
  const locale = useLocale();

  const INITIAL_STATE: FormState = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    postalCode: "",
    country: "",
    language: locale === "fr" ? "fr" : "de",
    address: "",
    message: "",
  };

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
              <select
                aria-label={t("placeholder.country")}
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                disabled={isSubmitting}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="" style={{ color: "#333" }}>{t("placeholder.country")}</option>
                <option value="Deutschland" style={{ color: "#333" }}>Deutschland</option>
                <option value="Österreich" style={{ color: "#333" }}>Österreich</option>
                <option value="Schweiz" style={{ color: "#333" }}>Schweiz</option>
                <option value="Frankreich" style={{ color: "#333" }}>Frankreich</option>
                <option value="Belgien" style={{ color: "#333" }}>Belgien</option>
                <option value="Niederlande" style={{ color: "#333" }}>Niederlande</option>
                <option value="Luxemburg" style={{ color: "#333" }}>Luxemburg</option>
                <option value="Italien" style={{ color: "#333" }}>Italien</option>
                <option value="Spanien" style={{ color: "#333" }}>Spanien</option>
                <option value="Andere" style={{ color: "#333" }}>{t("placeholder.otherCountry")}</option>
              </select>
              <select
                aria-label={t("placeholder.language")}
                value={form.language}
                onChange={(e) => handleChange("language", e.target.value)}
                disabled={isSubmitting}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="de" style={{ color: "#333" }}>Deutsch</option>
                <option value="fr" style={{ color: "#333" }}>Français</option>
              </select>
              <input
                type="text"
                className="full"
                placeholder={t("placeholder.address")}
                aria-label={t("placeholder.address")}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
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
