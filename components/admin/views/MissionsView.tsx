'use client';

import { useCallback, useEffect, useState } from 'react';

// ============================================================
// Types
// ============================================================

type MissionStatus = 'disponible' | 'assignee' | 'terminee';

type Mission = {
  id: string;
  zone: string;
  product: string | null;
  payMode: 'hourly' | 'package' | null;
  weeklyPackages: number | null;
  startDate: string | null;
  status: MissionStatus;
  createdAt: string;
  application: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type Emballeur = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string | null;
  postalCode: string;
};

type FetchState = 'loading' | 'success' | 'error';

// ============================================================
// Helpers
// ============================================================

const STATUS_CONFIG: Record<MissionStatus, { label: string; bg: string; color: string }> = {
  disponible: { label: 'Disponible', bg: 'rgba(255,167,38,0.12)', color: '#B26A00' },
  assignee: { label: 'Assignée', bg: 'rgba(46,160,67,0.12)', color: '#2EA043' },
  terminee: { label: 'Terminée', bg: 'rgba(100,116,139,0.12)', color: '#64748B' },
};

function payModeLabel(m: 'hourly' | 'package' | null): string {
  if (m === 'hourly') return "À l'heure";
  if (m === 'package') return 'Au colis';
  return '—';
}

// ============================================================
// Composant
// ============================================================

export function MissionsView() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [state, setState] = useState<FetchState>('loading');
  const [error, setError] = useState<string>('');

  // Emballeurs pour l'assignation
  const [emballeurs, setEmballeurs] = useState<Emballeur[]>([]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [assignMissionId, setAssignMissionId] = useState<string | null>(null);
  const [deleteMissionId, setDeleteMissionId] = useState<string | null>(null);

  // Form create
  const [fZone, setFZone] = useState('');
  const [fProduct, setFProduct] = useState('');
  const [fPayMode, setFPayMode] = useState<'hourly' | 'package' | ''>('');
  const [fWeekly, setFWeekly] = useState('');
  const [fDate, setFDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Assign
  const [assignEmballeurId, setAssignEmballeurId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // ============================================================
  // Fetch
  // ============================================================

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const [mRes, eRes] = await Promise.all([
        fetch('/api/admin/missions', { cache: 'no-store' }),
        fetch('/api/admin/applications?pipe=client&limit=100', { cache: 'no-store' }),
      ]);
      if (!mRes.ok) throw new Error(`Missions HTTP ${mRes.status}`);

      const mJson = await mRes.json();
      setMissions(mJson.data ?? []);

      if (eRes.ok) {
        const eJson = await eRes.json();
        const rows = (eJson.data ?? []) as Record<string, unknown>[];
        setEmballeurs(
          rows.map((r) => ({
            id: r.id as string,
            firstName: r.firstName as string,
            lastName: r.lastName as string,
            email: r.email as string,
            city: (r.city as string) ?? null,
            postalCode: r.postalCode as string,
          })),
        );
      }

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
  // Actions
  // ============================================================

  async function createMission() {
    if (!fZone.trim()) return;
    setCreating(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = { zone: fZone.trim() };
      if (fProduct.trim()) body.product = fProduct.trim();
      if (fPayMode) body.payMode = fPayMode;
      if (fWeekly) body.weeklyPackages = parseInt(fWeekly, 10);
      if (fDate) body.startDate = fDate;

      const res = await fetch('/api/admin/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      // Reset form
      setFZone('');
      setFProduct('');
      setFPayMode('');
      setFWeekly('');
      setFDate('');
      setCreateOpen(false);
      await load();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setCreating(false);
    }
  }

  async function assignMission() {
    if (!assignMissionId || !assignEmballeurId) return;
    setAssigning(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/missions/${assignMissionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: assignEmballeurId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.emailSent) {
        setFeedback({ type: 'ok', msg: 'Mission assignée ! Email envoyé à l\'emballeur.' });
      } else {
        setFeedback({
          type: 'err',
          msg: `Assignée mais email non envoyé : ${json.emailError ?? 'erreur'}`,
        });
      }
      setTimeout(() => {
        setAssignMissionId(null);
        setFeedback(null);
        setAssignEmballeurId('');
      }, 2000);
      await load();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setAssigning(false);
    }
  }

  async function deleteMission() {
    if (!deleteMissionId) return;
    try {
      const res = await fetch(`/api/admin/missions/${deleteMissionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      setDeleteMissionId(null);
      await load();
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Erreur de suppression',
      });
    }
  }

  async function markDone(id: string) {
    try {
      const res = await fetch(`/api/admin/missions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'terminee' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  // ============================================================
  // Render
  // ============================================================

  if (state === 'loading') {
    return (
      <div className="panel">
        <div className="panel-head"><h3>Missions</h3></div>
        <div className="panel-body">
          <div style={{ padding: '14px 8px', color: '#95A198' }}>Chargement…</div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="panel">
        <div className="panel-head"><h3>Missions</h3></div>
        <div className="panel-body">
          <div style={{ padding: '14px 8px', color: '#B33A3A' }}>Erreur : {error}</div>
          <button className="btn btn-primary" onClick={load}>Réessayer</button>
        </div>
      </div>
    );
  }

  const available = missions.filter((m) => m.status === 'disponible');
  const assigned = missions.filter((m) => m.status === 'assignee');
  const done = missions.filter((m) => m.status === 'terminee');

  return (
    <div>
      {/* Header + bouton créer */}
      <div className="panel">
        <div className="panel-head">
          <h3>
            Missions{' '}
            <span style={{ color: '#95A198', fontWeight: 400, fontSize: 13 }}>
              ({missions.length})
            </span>
          </h3>
          <button
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '6px 16px' }}
            onClick={() => { setCreateOpen(true); setFeedback(null); }}
          >
            + Nouvelle mission
          </button>
        </div>
        <div className="panel-body">
          {missions.length === 0 ? (
            <div style={{ padding: '24px 8px', color: '#95A198', textAlign: 'center' }}>
              Aucune mission pour le moment.
              <br />
              Cliquez sur <b>+ Nouvelle mission</b> pour en créer une.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Produit</th>
                  <th>Mode de paie</th>
                  <th>Cadence</th>
                  <th>Emballeur</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...available, ...assigned, ...done].map((m) => {
                  const sc = STATUS_CONFIG[m.status];
                  return (
                    <tr key={m.id}>
                      <td><b>{m.zone}</b></td>
                      <td>{m.product ?? '—'}</td>
                      <td>{payModeLabel(m.payMode)}</td>
                      <td className="amount">
                        {m.weeklyPackages != null ? `${m.weeklyPackages}/sem` : '—'}
                      </td>
                      <td>
                        {m.application ? (
                          <span>
                            {m.application.firstName} {m.application.lastName}
                            <br />
                            <small style={{ color: '#95A198' }}>{m.application.email}</small>
                          </span>
                        ) : (
                          <span style={{ color: '#95A198' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: sc.bg,
                          color: sc.color,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {m.status === 'disponible' && (
                            <button
                              className="btn btn-primary"
                              style={btnSm}
                              disabled={emballeurs.length === 0}
                              onClick={() => {
                                setAssignMissionId(m.id);
                                setAssignEmballeurId('');
                                setFeedback(null);
                              }}
                            >
                              Assigner
                            </button>
                          )}
                          {m.status === 'assignee' && (
                            <button
                              className="btn"
                              style={btnSm}
                              onClick={() => markDone(m.id)}
                            >
                              Terminer
                            </button>
                          )}
                          <button
                            className="btn"
                            style={{ ...btnSm, color: '#B33A3A' }}
                            onClick={() => setDeleteMissionId(m.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Feedback global */}
      {feedback && !assignMissionId && !createOpen && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
          padding: '12px 20px', borderRadius: 8, fontSize: 13,
          background: feedback.type === 'ok' ? 'rgba(46,160,67,0.95)' : 'rgba(179,58,58,0.95)',
          color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {feedback.msg}
        </div>
      )}

      {/* ====== Modal Créer mission ====== */}
      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title="Nouvelle mission">
          <p style={hintStyle}>
            Renseignez la zone et les détails. L&apos;emballeur recevra un email dès que la mission lui sera assignée.
          </p>

          <label style={labelStyle}>Zone <span style={{ color: '#B33A3A' }}>*</span></label>
          <input type="text" value={fZone} onChange={(e) => setFZone(e.target.value)}
            placeholder="Ex : Berlin Mitte, Hamburg-Zentrum…"
            style={inputStyle} autoFocus />

          <label style={{ ...labelStyle, marginTop: 16 }}>Type de colis (optionnel)</label>
          <input type="text" value={fProduct} onChange={(e) => setFProduct(e.target.value)}
            placeholder="Ex : Kosmetik, Papeterie…" style={inputStyle} />

          <label style={{ ...labelStyle, marginTop: 16 }}>Mode de rémunération</label>
          <select value={fPayMode} onChange={(e) => setFPayMode(e.target.value as 'hourly' | 'package' | '')}
            style={inputStyle}>
            <option value="">— Choisir —</option>
            <option value="hourly">À l&apos;heure (Stundenlohn)</option>
            <option value="package">Au colis (Pro Paket)</option>
          </select>

          {fPayMode === 'package' && (
            <>
              <label style={{ ...labelStyle, marginTop: 16 }}>Colis / semaine</label>
              <input type="number" value={fWeekly} onChange={(e) => setFWeekly(e.target.value)}
                placeholder="Ex : 50" style={inputStyle} min={0} />
            </>
          )}

          <label style={{ ...labelStyle, marginTop: 16 }}>Date de début (optionnel)</label>
          <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} style={inputStyle} />

          {feedback && (
            <div style={{ ...feedbackStyle, ...{ background: feedback.type === 'ok' ? 'rgba(46,160,67,0.08)' : 'rgba(179,58,58,0.08)', color: feedback.type === 'ok' ? '#2EA043' : '#B33A3A' } }}>
              {feedback.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn" style={btnMd} onClick={() => setCreateOpen(false)} disabled={creating}>Annuler</button>
            <button className="btn btn-primary" style={btnMd} onClick={createMission}
              disabled={creating || !fZone.trim()}>
              {creating ? 'Création…' : 'Créer la mission'}
            </button>
          </div>
        </Modal>
      )}

      {/* ====== Modal Assigner ====== */}
      {assignMissionId && (
        <Modal onClose={() => { setAssignMissionId(null); setFeedback(null); }} title="Assigner la mission">
          {emballeurs.length === 0 ? (
            <div style={{ padding: '16px 0', color: '#95A198', textAlign: 'center' }}>
              Aucun emballeur validé disponible.
              <br />
              Validez d&apos;abord des candidats dans la vue <b>Candidats</b>.
            </div>
          ) : (
            <>
              <label style={labelStyle}>Choisir un emballeur</label>
              <select value={assignEmballeurId}
                onChange={(e) => setAssignEmballeurId(e.target.value)}
                style={inputStyle} autoFocus>
                <option value="">— Sélectionner —</option>
                {emballeurs.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} — {e.city ?? e.postalCode}
                  </option>
                ))}
              </select>
              <p style={hintStyle}>
                L&apos;emballeur recevra automatiquement un email avec les détails de la mission.
              </p>

              {feedback && (
                <div style={{ ...feedbackStyle, ...{ background: feedback.type === 'ok' ? 'rgba(46,160,67,0.08)' : 'rgba(179,58,58,0.08)', color: feedback.type === 'ok' ? '#2EA043' : '#B33A3A' } }}>
                  {feedback.msg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button className="btn" style={btnMd}
                  onClick={() => { setAssignMissionId(null); setFeedback(null); }}
                  disabled={assigning}>Annuler</button>
                <button className="btn btn-primary" style={btnMd}
                  onClick={assignMission}
                  disabled={assigning || !assignEmballeurId}>
                  {assigning ? 'Assignation…' : 'Assigner & envoyer email'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ====== Modal Supprimer ====== */}
      {deleteMissionId && (
        <Modal onClose={() => setDeleteMissionId(null)} title="Supprimer la mission">
          <p style={{ fontSize: 14, color: '#3A4A42', lineHeight: 1.5 }}>
            Voulez-vous vraiment supprimer cette mission ? Cette action est irréversible.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn" style={btnMd} onClick={() => setDeleteMissionId(null)}>Annuler</button>
            <button className="btn" style={{ ...btnMd, background: '#B33A3A', color: '#fff' }}
              onClick={deleteMission}>Supprimer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Sub-components & styles
// ============================================================

function Modal({ children, onClose, title }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: 28,
        maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#3A4A42', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #D4DDD8',
  borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12, color: '#95A198', margin: '0 0 16px 0', lineHeight: 1.5,
};

const feedbackStyle: React.CSSProperties = {
  marginTop: 16, padding: '10px 14px', borderRadius: 6, fontSize: 13,
};

const btnSm: React.CSSProperties = {
  fontSize: 12, padding: '4px 12px',
};

const btnMd: React.CSSProperties = {
  padding: '8px 20px', fontSize: 13,
};
