// ============================================================
// Helper sanitize HTML — defense-in-depth (audit Kyle fix #3).
// ============================================================
// Dans EmailsView, les contenus injectés via `dangerouslySetInnerHTML`
// sont TOUS déjà échappés via `escapeHtml()` en amont — donc SAFE.
// Ce helper est une garde-fou anti-régression : si un dev futur oublie
// l'escape, sanitize supprimera les patterns dangereux connus.
//
// Implémentation : isomorphic-dompurify (gold standard OWASP).
// Fonctionne côté serveur (Node) et client (browser) sans config split.
// ============================================================

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize du HTML via DOMPurify (gold standard).
 * Supprime scripts, iframes, event handlers, javascript: URIs, etc.
 *
 * À utiliser en PLUS de escapeHtml() appliqué sur les inputs dynamiques.
 * Configuration conservatrice : n'autorise que les balises/formatage
 * attendus dans un email (pas de scripts, pas d'iframes, pas de forms).
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "span", "div",
      "a", "img", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "table", "thead", "tbody", "tr", "td", "th",
      "hr", "blockquote", "pre", "code",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "style", "class",
      "target", "rel", "width", "height",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}
