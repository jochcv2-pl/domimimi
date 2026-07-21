import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("laisse passer du HTML inoffensif", () => {
    const html = "<p>Bonjour <strong>Camille</strong></p>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("supprime les blocs <script>", () => {
    const html = '<p>OK</p><script>alert("xss")</script>';
    expect(sanitizeHtml(html)).toBe("<p>OK</p>");
  });

  it("supprime les tags <script> orphelins", () => {
    expect(sanitizeHtml("<script src='evil.js'>")).toBe("");
    expect(sanitizeHtml("</script>")).toBe("");
  });

  it("supprime les iframes", () => {
    const html = '<iframe src="https://evil.com"></iframe><p>OK</p>';
    expect(sanitizeHtml(html)).toBe("<p>OK</p>");
  });

  it("supprime les <object> et <embed>", () => {
    expect(sanitizeHtml('<object data="evil.swf"></object>')).toBe("");
    expect(sanitizeHtml('<embed src="evil.swf">')).toBe("");
  });

  it("supprime les attributs on* (onclick, onerror, onload…)", () => {
    const r1 = sanitizeHtml('<div onclick="alert(1)">text</div>');
    expect(r1).not.toContain("onclick");
    expect(r1).toContain("text");

    const r2 = sanitizeHtml("<img onerror='alert(1)' src=x>");
    expect(r2).not.toContain("onerror");
    expect(r2).toContain("src");
  });

  it("supprime le pseudo-protocol javascript: des href", () => {
    // DOMPurify supprime entièrement le href contenant javascript:
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript");
    expect(result).toContain("click");
    expect(result).toContain("<a");
  });

  it("retourne une chaîne vide pour undefined/null cast", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("gère les attaques combinées", () => {
    const evil =
      '<div onclick="steal()"><script>evil()</script><iframe src="x"></iframe>safe</div>';
    const result = sanitizeHtml(evil);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("onclick");
    expect(result).toContain("safe");
  });
});
