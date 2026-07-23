'use client';

import { useCallback, useEffect, useState } from 'react';
import { applicationToUiContact, type UiContact } from '@/lib/mappers';

// ============================================================
// Types
// ============================================================

type Emballeur = UiContact;

type AssignedMission = {
  id: string;
  zone: string;
  product: string | null;
  payMode: 'hourly' | 'package' | null;
  weeklyPackages: number | null;
  startDate: string | null;
  status: string;
};

type FetchState = 'loading' | 'success' | 'error';

function payModeLabel(m: 'hourly' | 'package' | null): string {
  if (m === 'hourly') return 'Stundenlohn';
  if (m === 'package') return 'Pro Paket';
  return '—';
}

// ============================================================
// Composant
// ============================================================

export function EmballeursView() {
  const [emballeurs, setEmballeurs] = useState<Emballeur[]>([]);
  const [missionsByEmballeur, setMissionsByEmballeur] = useState<Record<string, AssignedMission[]>>({});
  const [state, setState] = useState<FetchState>('loading');
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const [eRes, mRes] = await Promise.all([
        fetch('/api/admin/applications?pipe=client&limit=100', { cache: 'no-store' }),
        fetch('/api/admin/missions', { cache: 'no-store' }),
      ]);
      if (!eRes.ok) throw new Error(`HTTP ${eRes.status}`);

      const eJson = await eJson2(eRes);
      setEmballeurs(eJson);

      // Grouper les missions assignées par emballeur
      const byEmballeur: Record<string, AssignedMission[]> = {};
      if (mRes.ok) {
        const mJson = await mRes.json();
        for (const m of (mJson.data ?? []) as Array<Record<string, unknown>>) {
          const appId = m.applicationId as string | null;
          if (!appId) continue;
          if (!byEmballeur[appId]) byEmballeur[appId] = [];
          byEmballeur[appId].push({
            id: m.id as string,
            zone: m.zone as string,
            product: (m.product as string) ?? null,
            payMode: (m.payMode as 'hourly' | 'package') ?? null,
            weeklyPackages: (m.weeklyPackages as number) ?? null,
            startDate: m.startDate ? new Date(m.startDate as string).toISOString() : null,
            status: m.status as string,
          });
        }
      }
      setMissionsByEmballeur(byEmballeur);
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
        <div className="panel-head"><h3>Emballeurs</h3></div>
        <div className="panel-body">
          <div style={{ padding: '14px 8px', color: '#95A198' }}>Chargement…</div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="panel">
        <div className="panel-head"><h3>Emballeurs</h3></div>
        <div className="panel-body">
          <div style={{ padding: '14px 8px', color: '#B33A3A' }}>Erreur : {error}</div>
          <button className="btn btn-primary" onClick={load}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>
          Emballeurs validés{' '}
          <span style={{ color: '#95A198', fontWeight: 400, fontSize: 13 }}>
            ({emballeurs.length})
          </span>
        </h3>
      </div>
      <div className="panel-body">
        {emballeurs.length === 0 ? (
          <div style={{ padding: '24px 8px', color: '#95A198', textAlign: 'center' }}>
            Aucun emballeur validé pour le moment.
            <br />
            Validez des candidats depuis la vue <b>Candidats</b>.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Emballeur</th>
                <th>Email</th>
                <th>Ville</th>
                <th>Mission(s) assignée(s)</th>
              </tr>
            </thead>
            <tbody>
              {emballeurs.map((e) => {
                const missions = missionsByEmballeur[e.id] ?? [];
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="cust">
                        <div className="ini">{e.ini}</div>
                        <div>
                          <b>{e.name}</b>
                          <small>Validé{e.validatedAt ? ` le ${new Date(e.validatedAt).toLocaleDateString('fr-FR')}` : ''}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#6B7A72' }}>{e.email}</td>
                    <td>{e.city ?? e.postalCode}</td>
                    <td>
                      {missions.length === 0 ? (
                        <span style={{ color: '#95A198', fontSize: 13 }}>
                          Aucune mission — voir l&apos;onglet <b>Missions</b>
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {missions.map((m) => (
                            <span
                              key={m.id}
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 4,
                                fontSize: 12,
                                background: m.status === 'terminee'
                                  ? 'rgba(100,116,139,0.1)'
                                  : 'rgba(46,160,67,0.1)',
                                color: m.status === 'terminee' ? '#64748B' : '#2EA043',
                              }}
                            >
                              {m.zone}
                              {m.product ? ` · ${m.product}` : ''}
                              {m.payMode ? ` · ${payModeLabel(m.payMode)}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Helper pour éviter la confusion de nom
async function eJson2(res: Response): Promise<Emballeur[]> {
  const json = await res.json();
  const data = (json?.data ?? []) as Parameters<typeof applicationToUiContact>[0][];
  return data.map(applicationToUiContact);
}
