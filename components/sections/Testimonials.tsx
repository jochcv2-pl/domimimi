import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import Reveal from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";

type TestimonialRow = {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  photoUrl: string | null;
  sort: number;
};

export default async function Testimonials() {
  const t = await getTranslations("testimonials");

  // Récupère les témoignages depuis la DB (ajoutés via l'admin CRM).
  // Si aucun témoignage n'existe, on retombe sur les 3 témoignages par défaut
  // définis dans les fichiers de traduction (compatibilité arrière).
  let rows: TestimonialRow[] = [];
  try {
    rows = await prisma.testimonial.findMany({
      where: { active: true },
      orderBy: { sort: "asc" },
    });
  } catch {
    // Si la table n'existe pas encore (migration pas appliquée), fallback silencieux
    rows = [];
  }

  const useDb = rows.length > 0;

  const items = useDb
    ? rows.map((r) => ({
        name: r.name,
        role: r.role,
        quote: r.quote,
        rating: r.rating,
        photoUrl: r.photoUrl,
      }))
    : [
        { name: t("name1"), role: t("role1"), quote: t("quote1"), rating: 5, photoUrl: null },
        { name: t("name2"), role: t("role2"), quote: t("quote2"), rating: 5, photoUrl: null },
        { name: t("name3"), role: t("role3"), quote: t("quote3"), rating: 5, photoUrl: null },
      ];

  return (
    <section className="domipack-pad bg-sage">
      <div className="domipack-wrap">
        <Reveal className="section-head" as="div">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2>{t("title")}</h2>
        </Reveal>
        <div className="quotes">
          {items.map((item, i) => {
            const initials = item.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Reveal className="quote" key={i}>
                <div className="stars" style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Icon
                      key={idx}
                      name="starFilled"
                      size={14}
                      color="var(--honey)"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <p>{item.quote}</p>
                <div className="who">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.name}
                      className="avatar"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div className="avatar">{initials}</div>
                  )}
                  <div>
                    <b>{item.name}</b>
                    <small>{item.role}</small>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
