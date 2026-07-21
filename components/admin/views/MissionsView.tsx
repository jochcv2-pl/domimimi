'use client';

import { useCallback, useEffect, useState } from 'react';
import { applicationToUiContact, type UiContact } from '@/lib/mappers';

// ============================================================
// Types — une mission est une Application validée (pipe=client)
// avec champs mission renseignés.
// ============================================================

type MissionApplication = UiContact & {
  product: string | null;
  payMode: 'hourly' | 'package' | null;
  weeklyPackages: number | null;
  startDate: string | null;
};

type FetchState = 'loading' | 'success' | 'error';

// Format français : 12,50 ou 1 380
const fr = (n: number, decimals = 0) =>
  n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// Calcule une estimation mensuelle approximative (4 semaines).
// On garde l'estimation simple "modulo mock" en attendant la vraie grille
// connectée à l'Agent Mission (itération 2b).
function estimateMonthly(m: MissionApplication): string {
  if (!m.payMode) return '—';
  if (m.payMode === 'hourly') {
    // Hypothèse : 10h/semaine × taux moyen 13€ × 4 semaines = ~520€
    // Approximation — sera raffinée quand l'Agent Mission calculera réellement.
    const weeklyHours = 10;
    const hourlyRate = 13;
    return `≈ ${fr(weeklyHours * hourlyRate * 4)} €/mois`;
  }
  // package
  const perPackage = 0.95; // moyenne entre 0.80 et 1.10
  const wk = m.weeklyPackages ?? 0;
  return `≈ ${fr(Math.round(wk * perPackage * 4))} €/mois`;
}

function payModeLabel(m: 'hourly' | 'package' | null): string {
  if (m === 'hourly') return "À l'heure";
  if (m === 'package') return 'Au colis';
  return '—';
}

// ============================================================
// Composant
// ============================================================

export function MissionsView() {
  const [missions, setMissions] = useState<MissionApplication[]>([]);
  const [state, setState] = useState<FetchState>('loading');
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      // On récupère les candidatures validées (pipe=client).
      const res = await fetch('/api/admin/applications?pipe=client&limit=100', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = (json?.data ?? []) as Parameters<typeof applicationToUiContact>[0][];
      const mapped = rows.map((r) => {
        const base = applicationToUiContact(r);
        return {
          ...base,
          product: r.product ?? null,
          payMode: (r.payMode ?? null) as MissionApplication['payMode'],
          weeklyPackages: r.weeklyPackages ?? null,
          startDate: r.startDate ? new Date(r.startDate).toISOString() : null,
        } satisfies MissionApplication;
      });
      setMissions(mapped);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ============================================================
  // Render
  // ============================================================

  if (state === 'loading') {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Toutes les missions</h3>
        </div>
        <div className="panel-body">
          <div style={{ padding: '14px 8px', color: '#95A198' }}>Chargement des missions…</div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Toutes les missions</h3>
        </div>
        <div className="panel-body">
          <div style={{ padding: '14px 8px', color: '#B33A3A' }}>Erreur : {error}</div>
          <button className="btn btn-primary" onClick={load}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3>
            Toutes les missions{' '}
            <span style={{ color: '#95A198', fontWeight: 400, fontSize: 13 }}>
              ({missions.length} emballeur{missions.length > 1 ? 's' : ''} validé{missions.length > 1 ? 's' : ''})
            </span>
          </h3>
        </div>
        <div className="panel-body">
          {missions.length === 0 ? (
            <div style={{ padding: '24px 8px', color: '#95A198', textAlign: 'center' }}>
              Aucun emballeur validé pour le moment.
              <br />
              Les candidatures passées en statut <b>Client</b> apparaîtront ici automatiquement.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Emballeur</th>
                  <th>Zone</th>
                  <th>Produit</th>
                  <th>Colis / sem.</th>
                  <th>Mode de paie</th>
                  <th>R · mun. estimée</th>
                  <th>Validé le</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id} className="tr-click">
                    <td>
                      <div className="cust">
                        <div className="ini">{m.ini}</div>
                        <div>
                          <b>{m.name}</b>
                          <small>{m.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{m.zone ?? m.city ?? '—'}</td>
                    <td>{m.product ?? '—'}</td>
                    <td className="amount">
                      {m.weeklyPackages != null ? fr(m.weeklyPackages) : '—'}
                    </td>
                    <td>{payModeLabel(m.payMode)}</td>
                    <td className="amount">{estimateMonthly(m)}</td>
                    <td>
                      {m.validatedAt
                        ? new Date(m.validatedAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
