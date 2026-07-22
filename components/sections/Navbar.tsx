"use client";

import { useState } from "react";

/**
 * Navbar · barre de navigation Domipack.
 * Composant client pour la gestion de l'état du menu burger mobile.
 * Reproduit fidèlement le HTML de référence de la landing page.
 */
export default function Navbar({ brandName = "Domipack", logoUrl }: { brandName?: string; logoUrl?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <div className="domipack-wrap nav">
        <a href="#" className="logo">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} style={{ height: 28, width: "auto" }} />
          ) : (
            <>
              <svg className="mark" viewBox="0 0 30 24" fill="none">
                <path d="M2 7 15 1l13 6-13 6z" fill="#C08A5A" />
                <path d="M2 7v10l13 6V13z" fill="#1E3A2F" />
                <path d="M28 7v10l-13 6V13z" fill="#2C5344" />
                <path d="M9 4l13 6" stroke="#E8A93C" strokeWidth="1.6" />
              </svg>
              {brandName}
            </>
          )}
        </a>
        <nav className={`nav-links${open ? " open" : ""}`}>
          <a href="#avantages" onClick={() => setOpen(false)}>
            Avantages
          </a>
          <a href="#etapes" onClick={() => setOpen(false)}>
            Comment ça marche
          </a>
          <a href="#profil" onClick={() => setOpen(false)}>
            Profil recherch…
          </a>
          <a href="#faq" onClick={() => setOpen(false)}>
            Questions
          </a>
        </nav>
        <a href="#postuler" className="btn btn-primary">
          Postuler
        </a>
        <button
          className="burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "?" : "?"}
        </button>
      </div>
    </header>
  );
}
