"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export default function Navbar({ brandName = "domipackung", logoUrl }: { brandName?: string; logoUrl?: string | null }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "de" | "fr" });
    setLangOpen(false);
    setOpen(false);
  };

  return (
    <header>
      <div className="domipack-wrap nav">
        <a href="#" className="logo">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} style={{ height: 28, width: "auto" }} />
          ) : (
            <svg className="mark" viewBox="0 0 30 24" fill="none">
              <path d="M2 7 15 1l13 6-13 6z" fill="#C08A5A" />
              <path d="M2 7v10l13 6V13z" fill="#1E3A2F" />
              <path d="M28 7v10l-13 6V13z" fill="#2C5344" />
              <path d="M9 4l13 6" stroke="#E8A93C" strokeWidth="1.6" />
            </svg>
          )}
          {brandName}
        </a>
        <nav className={`nav-links${open ? " open" : ""}`}>
          <a href="#avantages" onClick={() => setOpen(false)}>{t("avantages")}</a>
          <a href="#etapes" onClick={() => setOpen(false)}>{t("howItWorks")}</a>
          <a href="#profil" onClick={() => setOpen(false)}>{t("profile")}</a>
          <a href="#faq" onClick={() => setOpen(false)}>{t("questions")}</a>
        </nav>
        <div className="nav-actions">
          {/* Language switcher */}
          <div className="lang-switch">
            <button
              className="lang-btn"
              onClick={() => setLangOpen((v) => !v)}
              aria-label={t("languageLabel")}
            >
              {locale.toUpperCase()}
            </button>
            {langOpen && (
              <div className="lang-menu">
                <button
                  className={locale === "de" ? "active" : ""}
                  onClick={() => switchLocale("de")}
                >DE</button>
                <button
                  className={locale === "fr" ? "active" : ""}
                  onClick={() => switchLocale("fr")}
                >FR</button>
              </div>
            )}
          </div>
          <a href="#postuler" className="btn btn-primary">{t("apply")}</a>
        </div>
        <button
          className="burger"
          aria-label={t("menu")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Icon name="x" size={22} /> : <Icon name="menu" size={22} />}
        </button>
      </div>
    </header>
  );
}
