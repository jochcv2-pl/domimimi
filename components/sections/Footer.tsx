/**
 * Footer · pied de page Domipack.
 * Composant serveur (pas de 'use client').
 * Reproduit fidèlement le HTML de référence de la landing page.
 */
export default function Footer({ brandName = "Domipack", logoUrl }: { brandName?: string; logoUrl?: string | null }) {
  return (
    <footer>
      <div className="domipack-wrap">
        <div className="foot-grid">
          <div style={{ maxWidth: "280px" }}>
            <div className="logo" style={{ marginBottom: "14px" }}>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} style={{ height: 28, width: "auto" }} />
              ) : (
                <>
                  <svg className="mark" viewBox="0 0 30 24" fill="none">
                    <path d="M2 7 15 1l13 6-13 6z" fill="#C08A5A" />
                    <path d="M2 7v10l13 6V13z" fill="#0F2019" />
                    <path d="M28 7v10l-13 6V13z" fill="#2C5344" />
                  </svg>
                  {brandName}
                </>
              )}
            </div>
            <p>
              Le conditionnement à domicile, fait dans les règles. Vrai contrat,
              zéro frais.
            </p>
          </div>
          <div>
            <h4>{brandName}</h4>
            <a href="#avantages">Avantages</a>
            <a href="#etapes">Comment ça marche</a>
            <a href="#profil">Profil recherché</a>
          </div>
          <div>
            <h4>Candidats</h4>
            <a href="#postuler">Postuler</a>
            <a href="#faq">Questions fréquentes</a>
            <a href="#">Espace candidat</a>
          </div>
          <div>
            <h4>Infos</h4>
            <a href="/mentions-legales">Mentions làgales</a>
            <a href="/confidentialite">Confidentialité</a>
            <a href="/contact">Nous contacter</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>
            ≈ 2026 {brandName} · Maquette de démonstration. Marque et contenus
            fictifs.
          </span>
          <span>Fait avec soin ??</span>
        </div>
      </div>
    </footer>
  );
}
