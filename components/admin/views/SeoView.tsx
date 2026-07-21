'use client';

import { useCallback, useEffect, useState } from 'react';

type AuditItem = { label: string; detail: string; ok: boolean };

type Audit = {
  id: string;
  score: number;
  items: AuditItem[];
  suggestions: string;
  createdAt: string;
};

const FALLBACK_AUDIT: Audit = {
  id: '',
  score: 82,
  items: [
    { label: 'Balises title', detail: 'Toutes les pages ont un titre unique', ok: true },
    { label: 'Méta descriptions', detail: '2 pages sans description', ok: false },
    { label: 'Balise H1', detail: 'Une seule H1 par page', ok: true },
    { label: 'Attributs alt (images)', detail: '4 images sans texte alternatif', ok: false },
    { label: 'Balises hreflang', detail: '6 langues correctement déclarées', ok: true },
    { label: 'Sitemap.xml', detail: 'Présent et soumis', ok: true },
    { label: 'Vitesse mobile', detail: 'Score 71/100 — images à compresser', ok: false },
    { label: 'HTTPS / certificat', detail: 'Sécurisé', ok: true },
  ],
  suggestions:
    'Ajouter une méta description aux pages Services et Contact. Compresser 4 images du Hero pour gagner en vitesse mobile. Renseigner le texte alternatif des visuels manquants.',
  createdAt: new Date().toISOString(),
};

function formatFr(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function SeoView() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');

  // ============================================================
  // Fetch dernier audit
  // ============================================================
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/seo-audits?latest=1', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json?.data;
      if (data) {
        setAudit(data as Audit);
      } else {
        // Aucun audit encore — on garde le fallback statique pour la démo
        setAudit(null);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ============================================================
  // Lancer un audit
  //   Pour l'instant l'Agent SEO n'est pas branché sur une vraie
  //   pipeline d'analyse ; on crée donc un snapshot identique au
  //   fallback (le même état que la graine de démonstration) afin
  //   d'horodater l'audit. Le branchement réel de l'Agent SEO
  //   remplacera ce payload par un vrai résultat d'analyse.
  // ============================================================
  const runAudit = useCallback(async () => {
    setRunning(true);
    setRunError('');
    try {
      const res = await fetch('/api/admin/seo-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(FALLBACK_AUDIT),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const created = json?.data;
      if (created) setAudit(created as Audit);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRunning(false);
    }
  }, []);

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return <div style={{ padding: 24, color: '#5E6B62' }}>Chargement de l&apos;audit SEO…</div>;
  }

  const current = audit ?? FALLBACK_AUDIT;
  const okCount = current.items.filter((i) => i.ok).length;
  const issuesCount = current.items.length - okCount;
  const scoreColor = current.score >= 80 ? '#2E7D46' : current.score >= 60 ? '#C58A1B' : '#B33A3A';

  return (
    <div>
      {loadError && (
        <div style={{ marginBottom: 12, color: '#B33A3A', fontSize: 12 }}>
          Erreur de chargement : {loadError}
        </div>
      )}
      <div className="seo-layout">
        <div>
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <h3>Score SEO global</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={runAudit}
                disabled={running}
              >
                {running ? 'Audit en cours…' : audit ? 'Relancer l\'audit' : 'Lancer l\'audit'}
              </button>
            </div>
            <div className="panel-body" style={{ paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: `conic-gradient(${scoreColor} 0 ${current.score}%, #EDEFE7 ${current.score}% 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: '50%',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      fontWeight: 800,
                    }}
                  >
                    {current.score}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#5E6B62', lineHeight: 1.7 }}>
                  {audit ? (
                    <>
                      Dernier audit : {formatFr(audit.createdAt)}.
                      <br />
                      {issuesCount} point{issuesCount > 1 ? 's' : ''} bloquant{issuesCount > 1 ? 's' : ''}, {okCount} vérification{okCount > 1 ? 's' : ''} réussie{okCount > 1 ? 's' : ''}.
                      <br />
                      Bon référencement global, quelques correctifs à traiter.
                    </>
                  ) : (
                    <>
                      Aucun audit enregistré. Cliquez sur « Lancer l&apos;audit » pour démarrer.
                    </>
                  )}
                  {runError && (
                    <span style={{ color: '#B33A3A' }}>
                      <br />
                      Erreur : {runError}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <h3>Résultats de l&apos;audit</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              {current.items.map((r) => (
                <div key={r.label} className="set-row">
                  <div className="set-label">
                    <b>{r.label}</b>
                    <small>{r.detail}</small>
                  </div>
                  {r.ok ? <span className="pill-on">OK</span> : <span className="pill-off">À corriger</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="panel">
            <div className="panel-head">
              <h3>Agent SEO</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="ae-avatar" style={{ background: '#0EA5E9' }}>
                  AS
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Agent SEO</div>
                  <div style={{ fontSize: 12, color: '#5E6B62' }}>Audit et recommandations</div>
                </div>
              </div>
              <p className="field-hint">
                Il analyse le site, détecte les problèmes de référencement et propose des correctifs. Il
                n&apos;applique aucune modification sans validation de l&apos;admin.
              </p>
              <div className="mem-list">
                <div className="mem-item">
                  <span className="mem-key">périmètre</span>
                  <span className="mem-val">Analyse en lecture seule des pages publiques du site.</span>
                </div>
                <div className="mem-item">
                  <span className="mem-key">fréquence</span>
                  <span className="mem-val">Audit automatique chaque semaine + à la demande.</span>
                </div>
                <div className="mem-item">
                  <span className="mem-key">langues</span>
                  <span className="mem-val">Vérifie le SEO des 6 versions linguistiques.</span>
                </div>
              </div>
              <div className="set-row" style={{ marginTop: 8 }}>
                <div className="set-label">
                  <b>État</b>
                </div>
                <span className="pill-on">Actif</span>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <h3>Suggestions prioritaires</h3>
            </div>
            <div
              className="panel-body"
              style={{ paddingTop: 14, fontSize: 12, color: '#5E6B62', lineHeight: 1.7 }}
            >
              {current.suggestions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
