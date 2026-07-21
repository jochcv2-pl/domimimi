'use client';

import { useCallback, useEffect, useState } from 'react';
import { PIPELINE_STATUSES } from '../Pipeline';

// ============================================================
// Types
// ============================================================

type Stats = {
  kpis: {
    totalApplications: number;
    candidatsActifs: number;
    emballeurs: number;
    nouveaux7j: number;
  };
  byPipe: Record<string, number>;
  bySource: { source: string; count: number }[];
  byCity: { city: string; count: number }[];
};

type FetchState = 'loading' | 'success' | 'error';

// ============================================================
// Helpers visuels
// ============================================================

// Couleurs des barres du pipeline dashboard (cohérentes avec Pipeline.tsx).
const PIPE_COLORS: Record<string, string> = {
  nouveau: '#9A6B1E',
  contacte: '#3B82F6',
  encours: '#1E3A8A',
  offre: '#7C3AED',
  attente: '#D97706',
  client: '#16A34A',
  perdu: '#DC2626',
};

// Labels lisibles pour le dashboard admin.
const PIPE_DASH_LABELS: Record<string, { name: string; label: string }> = {
  nouveau: { name: 'Candidats', label: 'Nouveau' },
  contacte: { name: 'Contactés', label: 'Contacté' },
  encours: { name: 'En qualification', label: 'En cours' },
  offre: { name: 'Mission proposée', label: 'Offre envoyée' },
  attente: { name: 'En attente', label: 'En attente' },
  client: { name: 'Emballeurs', label: 'Client' },
  perdu: { name: 'Perdus', label: 'Perdu' },
};

// ============================================================
// Composant
// ============================================================

export function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [error, setError] = useState<string>('');

  const loadStats = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStats(json as Stats);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setState('error');
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ============================================================
  // Loading state
  // ============================================================

  if (state === 'loading') {
    return (
      <div className="dashboard-view">
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi">
              <div className="kpi-label" style={{ background: '#eeede8', borderRadius: 4, height: 14, width: '60%' }} />
              <div className="kpi-value" style={{ background: '#e5e3dd', borderRadius: 6, height: 36, width: '40%', margin: '10px 0' }} />
              <div className="kpi-trend" style={{ background: '#eeede8', borderRadius: 4, height: 12, width: '40%' }} />
            </div>
          ))}
        </div>
        <p className="field-hint" style={{ textAlign: 'center', padding: 24, color: '#95A198' }}>
          Chargement des statistiques…
        </p>
      </div>
    );
  }

  // ============================================================
  // Error state
  // ============================================================

  if (state === 'error' || !stats) {
    return (
      <div className="dashboard-view" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9B2C2C', marginBottom: 8 }}>⚠ Impossible de charger les statistiques.</p>
          <p style={{ color: '#95A198', fontSize: '0.85rem', marginBottom: 16 }}>{error}</p>
          <button className="btn btn-ghost" onClick={loadStats}>Réessayer</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Success — KPIs + pipeline + top sources
  // ============================================================

  const k = stats.kpis;
  const maxPipe = Math.max(1, ...Object.values(stats.byPipe));

  return (
    <div className="dashboard-view">
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Candidats actifs</div>
          <div className="kpi-value">{k.candidatsActifs}</div>
          <div className="kpi-trend up">+{k.nouveaux7j} cette semaine</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Emballeurs validés</div>
          <div className="kpi-value">{k.emballeurs}</div>
          <div className="kpi-trend up">Total cumulé</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total candidatures</div>
          <div className="kpi-value">{k.totalApplications}</div>
          <div className="kpi-trend up">Depuis le début</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Nouvelles (7 j)</div>
          <div className="kpi-value">{k.nouveaux7j}</div>
          <div className="kpi-trend up">Cette semaine</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Pipeline — répartition réelle</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 16 }}>
            <div className="pipe">
              {PIPELINE_STATUSES.map((s) => {
                const count = stats.byPipe[s.id] ?? 0;
                const pct = Math.round((count / maxPipe) * 100);
                const dash = PIPE_DASH_LABELS[s.id];
                return (
                  <div className="pipe-row" key={s.id}>
                    <span className="pipe-name">{dash.name}</span>
                    <div className="pipe-bar">
                      <div
                        className="pipe-fill"
                        style={{
                          width: `${pct}%`,
                          background: PIPE_COLORS[s.id],
                        }}
                      ></div>
                    </div>
                    <span className="pipe-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head">
              <h3>Top sources</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 14 }}>
              {stats.bySource.length === 0 ? (
                <p className="field-hint" style={{ textAlign: 'center', padding: '16px 0' }}>
                  Aucune source enregistrée.
                </p>
              ) : (
                stats.bySource.map((s) => (
                  <div className="set-row" key={s.source}>
                    <div className="set-label">
                      <b>{s.source}</b>
                    </div>
                    <span className="pipe-count">{s.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Top villes</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 14 }}>
              {stats.byCity.length === 0 ? (
                <p className="field-hint" style={{ textAlign: 'center', padding: '16px 0' }}>
                  Aucune ville enregistrée.
                </p>
              ) : (
                stats.byCity.map((c) => (
                  <div className="set-row" key={c.city}>
                    <div className="set-label">
                      <b>{c.city}</b>
                    </div>
                    <span className="pipe-count">{c.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
