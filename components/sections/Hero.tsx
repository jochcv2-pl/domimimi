import Reveal from "@/components/ui/Reveal";

export default function Hero() {
  return (
    <section className="hero">
      <div className="domipack-wrap hero-grid">
        <Reveal>
          <span className="eyebrow">Recrutement · Emballage à domicile</span>
          <h1>
            Emballez chez vous,
            <br />à <em>votre rythme</em>.
          </h1>
          <p className="lead">
            Domipack recrute des personnes soigneuses pour préparer et
            conditionner des colis, tranquillement, depuis leur table de
            cuisine.
          </p>
          <div className="hero-cta">
            <a href="#postuler" className="btn btn-primary">
              Envoyer ma candidature
            </a>
            <a href="#etapes" className="btn btn-ghost">
              Voir comment ça marche
            </a>
          </div>
          <p className="hero-note">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M20 6L9 17l-5-5"
                stroke="#1E3A2F"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Aucun frais d&apos;inscription. Jamais. Vrai contrat, salaire
            déclaré.
          </p>
        </Reveal>

        <Reveal className="box-art">
          <svg viewBox="0 0 420 380" xmlns="http://www.w3.org/2000/svg">
            {/* back flaps */}
            <path d="M110 150 L210 90 L310 150 L210 175 Z" fill="#B37E4F" />
            <path d="M110 150 L210 90 L110 60 L40 120 Z" fill="#C99164" />
            <path d="M310 150 L210 90 L310 60 L380 120 Z" fill="#C99164" />
            {/* box body */}
            <path d="M110 150 L210 190 L210 320 L110 280 Z" fill="#A6744A" />
            <path d="M310 150 L210 190 L210 320 L310 280 Z" fill="#8F6440" />
            <path d="M110 150 L210 190 L310 150 L210 110 Z" fill="#C08A5A" />
            {/* tissue */}
            <path
              d="M150 145 Q210 118 270 145 Q225 168 210 165 Q175 168 150 145Z"
              fill="#E8A93C"
              opacity=".92"
            />
            <path
              d="M165 150 Q210 132 255 150 Q210 162 165 150Z"
              fill="#F1C572"
            />
            {/* front flaps open */}
            <path d="M110 280 L210 320 L150 360 L60 320 Z" fill="#CE9A6F" />
            <path d="M310 280 L210 320 L270 360 L360 320 Z" fill="#CE9A6F" />
            {/* tape */}
            <path
              d="M110 150 L210 190 L210 320 L110 280 Z"
              fill="#E8A93C"
              opacity=".18"
            />
            <rect
              x="196"
              y="188"
              width="28"
              height="132"
              fill="#DDBE86"
              opacity=".55"
            />
            {/* label */}
            <g transform="rotate(-6 250 240)">
              <rect
                x="228"
                y="218"
                width="66"
                height="46"
                rx="4"
                fill="#FCFBF7"
                stroke="#1E3A2F"
                strokeWidth="1.5"
              />
              <rect
                x="236"
                y="226"
                width="40"
                height="4"
                rx="2"
                fill="#1E3A2F"
              />
              <rect
                x="236"
                y="234"
                width="50"
                height="3"
                rx="1.5"
                fill="#9AA79E"
              />
              <rect
                x="236"
                y="240"
                width="34"
                height="3"
                rx="1.5"
                fill="#9AA79E"
              />
              <g fill="#1E3A2F">
                <rect x="236" y="250" width="2" height="8" />
                <rect x="240" y="250" width="1" height="8" />
                <rect x="243" y="250" width="3" height="8" />
                <rect x="248" y="250" width="1" height="8" />
                <rect x="251" y="250" width="2" height="8" />
                <rect x="255" y="250" width="3" height="8" />
                <rect x="260" y="250" width="1" height="8" />
                <rect x="263" y="250" width="2" height="8" />
              </g>
            </g>
          </svg>
        </Reveal>
      </div>
    </section>
  );
}
