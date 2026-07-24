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

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/seo-audits?latest=1', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json?.data;
      setAudit(data ? (data as Audit) : null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div style={{ padding: 24, color: '#5E6B62' }}>Chargement de l&apos;audit SEO…</div>;
  }

  const hasAudit = audit !== null;
  const okCount = hasAudit ? audit!.items.filter((i) => i.ok).length : 0;
  const issuesCount = hasAudit ? audit!.items.length - okCount : 0;
  const scoreColor = hasAudit
    ? audit!.score >= 80 ? '#2E7D46' : audit!.score >= 60 ? '#C58A1B' : '#B33A3A'
    : '#CCC';

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
            </div>
            <div className="panel-body" style={{ paddingTop: 18 }}>
              {hasAudit ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      background: `conic-gradient(${scoreColor} 0 ${audit!.score}%, #EDEFE7 ${audit!.score}% 100%)`,
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
                      {audit!.score}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#5E6B62', lineHeight: 1.7 }}>
                    Dernier audit : {formatFr(audit!.createdAt)}.
                    <br />
                    {issuesCount} point{issuesCount > 1 ? 's' : ''} bloquant{issuesCount > 1 ? 's' : ''}, {okCount} vérification{okCount > 1 ? 's' : ''} réussie{okCount > 1 ? 's' : ''}.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#95A198' }}>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>Aucun audit enregistré</p>
                  <p style={{ fontSize: 12 }}>L&apos;Agent SEO analysera automatiquement le site et générera un rapport.</p>
                </div>
              )}
            </div>
          </div>

          {hasAudit && (
            <div className="panel">
              <div className="panel-head">
                <h3>Résultats de l&apos;audit</h3>
              </div>
              <div className="panel-body" style={{ paddingTop: 8 }}>
                {audit!.items.map((r) => (
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
          )}

          {hasAudit && audit!.suggestions && (
            <div className="panel">
              <div className="panel-head">
                <h3>Suggestions prioritaires</h3>
              </div>
              <div
                className="panel-body"
                style={{ paddingTop: 14, fontSize: 12, color: '#5E6B62', lineHeight: 1.7 }}
              >
                {audit!.suggestions}
              </div>
            </div>
          )}
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
                Il analysera le site, détectera les problèmes de référencement et proposera des correctifs. Il
                n&apos;appliquera aucune modification sans validation de l&apos;admin.
              </p>
              <div className="mem-list">
                <div className="mem-item">
                  <span className="mem-key">périmètre</span>
                  <span className="mem-val">Analyse en lecture seule des pages publiques.</span>
                </div>
                <div className="mem-item">
                  <span className="mem-key">fréquence</span>
                  <span className="mem-val">Audit automatique chaque semaine + à la demande.</span>
                </div>
                <div className="mem-item">
                  <span className="mem-key">langues</span>
                  <span className="mem-val">Vérifie le SEO de toutes les versions linguistiques.</span>
                </div>
              </div>
              <div className="set-row" style={{ marginTop: 8 }}>
                <div className="set-label">
                  <b>État</b>
                </div>
                <span className="pill-off">Bientôt disponible</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
