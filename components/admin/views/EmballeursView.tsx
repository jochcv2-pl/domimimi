'use client';

import { useCallback, useEffect, useState } from 'react';
import { applicationToUiContact, type UiContact } from '@/lib/mappers';

// ============================================================
// Types
// ============================================================

type Emballeur = UiContact & {
  product: string | null;
  payMode: 'hourly' | 'package' | null;
  weeklyPackages: number | null;
  startDate: string | null;
  hasMission: boolean;
};

type FetchState = 'loading' | 'success' | 'error';

// ============================================================
// Composant
// ============================================================

export function EmballeursView() {
  const [emballeurs, setEmballeurs] = useState<Emballeur[]>([]);
  const [state, setState] = useState<FetchState>('loading');
  const [error, setError] = useState<string>('');

  // Formulaire d'assignation
  const [assignId, setAssignId] = useState<string | null>(null);
  const [zone, setZone] = useState('');
  const [product, setProduct] = useState('');
  const [payMode, setPayMode] = useState<'hourly' | 'package' | ''>('');
  const [weeklyPackages, setWeeklyPackages] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/admin/applications?pipe=client&limit=100', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = (json?.data ?? []) as Parameters<typeof applicationToUiContact>[0][];
      const mapped: Emballeur[] = rows.map((r) => {
        const base = applicationToUiContact(r);
        const hasMission = !!(r.zone || r.product || r.weeklyPackages || r.startDate);
        return {
          ...base,
          product: r.product ?? null,
          payMode: (r.payMode ?? null) as Emballeur['payMode'],
          weeklyPackages: r.weeklyPackages ?? null,
          startDate: r.startDate ? new Date(r.startDate).toISOString() : null,
          hasMission,
        };
      });
      setEmballeurs(mapped);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAssign(e: Emballeur) {
    setAssignId(e.id);
    setZone(e.zone ?? '');
    setProduct(e.product ?? '');
    setPayMode(e.payMode ?? '');
    setWeeklyPackages(e.weeklyPackages?.toString() ?? '');
    setStartDate(e.startDate ? e.startDate.split('T')[0] : '');
    setFeedback(null);
  }

  function closeAssign() {
    setAssignId(null);
    setFeedback(null);
  }

  async function submitMission() {
    if (!assignId || !zone.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = { zone: zone.trim() };
      if (product.trim()) body.product = product.trim();
      if (payMode) body.payMode = payMode;
      if (weeklyPackages) body.weeklyPackages = parseInt(weeklyPackages, 10);
      if (startDate) body.startDate = startDate;

      const res = await fetch(`/api/admin/applications/${assignId}/assign-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      const updated = json.data;

      // Mettre à jour la liste locale
      setEmballeurs((prev) =>
        prev.map((e) =>
          e.id === assignId
            ? {
                ...e,
                zone: updated.zone,
                product: updated.product,
                payMode: updated.payMode,
                weeklyPackages: updated.weeklyPackages,
                startDate: updated.startDate,
                hasMission: true,
              }
            : e,
        ),
      );

      if (json.emailSent) {
        setFeedback({ type: 'ok', msg: 'Mission assignée et email envoyé à l\'emballeur.' });
      } else {
        setFeedback({
          type: 'err',
          msg: `Mission assignée mais email non envoyé : ${json.emailError ?? 'erreur inconnue'}`,
        });
      }

      setTimeout(() => {
        setAssignId(null);
        setFeedback(null);
      }, 2500);
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Erreur',
      });
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // Render
  // ============================================================

  if (state === 'loading') {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Emballeurs</h3>
        </div>
        <div className="panel-body">
          <div style={{ padding: '14px 8px', color: '#95A198' }}>Chargement…</div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Emballeurs</h3>
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
              Validez des candidats depuis la vue <b>Candidats</b> pour les voir ici.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Emballeur</th>
                  <th>Email</th>
                  <th>Zone actuelle</th>
                  <th>Mission</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {emballeurs.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="cust">
                        <div className="ini">{e.ini}</div>
                        <div>
                          <b>{e.name}</b>
                          <small>{e.city ?? e.postalCode}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#6B7A72' }}>{e.email}</td>
                    <td>{e.zone ?? '—'}</td>
                    <td>
                      {e.hasMission ? (
                        <span
                          className="pill pill-ok"
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(46,160,67,0.12)',
                            color: '#2EA043',
                          }}
                        >
                          Mission assignée
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(255,167,38,0.12)',
                            color: '#B26A00',
                          }}
                        >
                          En attente
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '4px 12px' }}
                        onClick={() => openAssign(e)}
                      >
                        {e.hasMission ? 'Modifier mission' : 'Assigner mission'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal d'assignation de mission */}
      {assignId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeAssign}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 28,
              maxWidth: 500,
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18 }}>
              Assigner une mission
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#95A198' }}>
              L&apos;emballeur recevra automatiquement un email avec les détails de la mission.
            </p>

            {/* Zone — obligatoire, texte libre */}
            <label style={labelStyle}>
              Zone de la mission <span style={{ color: '#B33A3A' }}>*</span>
            </label>
            <input
              type="text"
              value={zone}
              onChange={(ev) => setZone(ev.target.value)}
              placeholder="Ex : Berlin Mitte, Hamburg-Zentrum…"
              style={inputStyle}
              autoFocus
            />
            <small style={hintStyle}>
              Écrivez la zone directement — pas de liste prédéfinie.
            </small>

            {/* Produit */}
            <label style={{ ...labelStyle, marginTop: 16 }}>
              Type de colis (optionnel)
            </label>
            <input
              type="text"
              value={product}
              onChange={(ev) => setProduct(ev.target.value)}
              placeholder="Ex : Kosmetik, Papeterie…"
              style={inputStyle}
            />

            {/* Mode de paie */}
            <label style={{ ...labelStyle, marginTop: 16 }}>
              Mode de rémunération (optionnel)
            </label>
            <select
              value={payMode}
              onChange={(ev) => setPayMode(ev.target.value as 'hourly' | 'package' | '')}
              style={inputStyle}
            >
              <option value="">— Choisir —</option>
              <option value="hourly">À l&apos;heure (Stundenlohn)</option>
              <option value="package">Au colis (Pro Paket)</option>
            </select>

            {/* Cadence */}
            {payMode === 'package' && (
              <>
                <label style={{ ...labelStyle, marginTop: 16 }}>
                  Colis par semaine
                </label>
                <input
                  type="number"
                  value={weeklyPackages}
                  onChange={(ev) => setWeeklyPackages(ev.target.value)}
                  placeholder="Ex : 50"
                  style={inputStyle}
                  min={0}
                />
              </>
            )}

            {/* Date de début */}
            <label style={{ ...labelStyle, marginTop: 16 }}>
              Date de début (optionnel)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(ev) => setStartDate(ev.target.value)}
              style={inputStyle}
            />

            {/* Feedback */}
            {feedback && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  background:
                    feedback.type === 'ok'
                      ? 'rgba(46,160,67,0.08)'
                      : 'rgba(179,58,58,0.08)',
                  color: feedback.type === 'ok' ? '#2EA043' : '#B33A3A',
                }}
              >
                {feedback.msg}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 24,
              }}
            >
              <button
                className="btn"
                onClick={closeAssign}
                style={{ padding: '8px 20px', fontSize: 13 }}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={submitMission}
                disabled={saving || !zone.trim()}
                style={{ padding: '8px 20px', fontSize: 13 }}
              >
                {saving
                  ? 'Envoi…'
                  : 'Assigner & envoyer l\'email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Styles inline (cohérents avec le CRM)
// ============================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#3A4A42',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #D4DDD8',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const hintStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#95A198',
  marginTop: 4,
};
