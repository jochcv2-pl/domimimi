// Endpoint de collecte des rapports CSP (Content-Security-Policy-Report-Only).
// Ne renvoie rien (le navigateur n'attend pas de réponse) — on log seulement.
// Permet d'observer les violations avant durcissement (passage en CSP strict).

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (body) {
      // Log structuré : `document-uri`, `violated-directive`, `blocked-uri`
      const report = body["csp-report"] ?? body;
      console.warn("[csp]", {
        directive: report["violated-directive"],
        uri: report["document-uri"],
        blocked: report["blocked-uri"],
        source: report["source-file"],
        line: report["line-number"],
      });
    }
  } catch {
    // Ne jamais faire échouer le report — silencieux
  }
  return new Response(null, { status: 204 });
}
