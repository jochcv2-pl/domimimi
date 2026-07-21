'use client';

import { useCallback, useEffect, useState } from 'react';

// ============================================================
// Types
// ============================================================

type PayRate = {
  id: string;
  type: 'base' | 'zone';
  mode: 'hourly' | 'package' | null;
  label: string;
  amount: number;
  unit: string;
  note: string | null;
  sort: number;
  active: boolean;
};

type FetchState = 'loading' | 'success' | 'error';

// ============================================================
// Composant
// ============================================================

export function RemunerationView() {
  const [rates, setRates] = useState<PayRate[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [fetchError, setFetchError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'ok' | 'error'>('idle');

  // ============================================================
  // Fetch
  // ============================================================

  const load = useCallback(async () => {
    setFetchState('loading');
    setFetchError('');
    try {
      const res = await fetch('/api/admin/pay-rates', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRates((json?.data ?? []) as PayRate[]);
      setFetchState('success');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erreur inconnue');
      setFetchState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ============================================================
  // Update local ( avant persist)
  // ============================================================

  const updateAmount = (id: string, amount: number) => {
    setRates((rs) => rs.map((r) => (r.id === id ? { ...r, amount } : r)));
    setSaveState('idle');
  };

  // ============================================================
  // Save bulk
  // ============================================================

  const save = useCallback(async () => {
    setSaving(true);
    setSaveState('idle');
    try {
      const res = await fetch('/api/admin/pay-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: rates.map((r) => ({
            id: r.id,
            amount: r.amount,
            label: r.label,
            unit: r.unit,
            note: r.note,
            active: r.active,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erreur sauvegarde');
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  }, [rates]);

  // ============================================================
  // Render helpers
  // ============================================================

  if (fetchState === 'loading') {
    return <div className="rate-note">Chargement de la grille…</div>;
  }
  if (fetchState === 'error') {
    return (
      <div>
        <div className="rate-note" style={{ color: '#B33A3A' }}>
          Erreur : {fetchError}
        </div>
        <button className="btn btn-primary" onClick={load}>Réessayer</button>
      </div>
    );
  }

  const baseRates = rates.filter((r) => r.type === 'base' && r.active);
  const zoneRates = rates.filter((r) => r.type === 'zone' && r.active);

  // Format français : 12,50 (pas 12.50)
  const fr = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div className="rate-note">
        <b>Ces taux alimentent directement le simulateur de paie du site, les emails Agent Mission et la vue Missions.</b>{' '}
        Toute modification est appliquée en temps réel après enregistrement.
        Les majorations par zone priment sur le taux de base du mode de paie.
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Taux de base par mode de paie</h3>
          </div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Mode de paie</th>
                  <th>Montant</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {baseRates.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ color: '#95A198', padding: '14px 8px' }}>
                      Aucun taux de base actif.
                    </td>
                  </tr>
                ) : (
                  baseRates.map((r) => (
                    <tr key={r.id}>
                      <td>{r.label}</td>
                      <td>
                        <input
                          className="rate-input"
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.amount}
                          onChange={(e) => updateAmount(r.id, parseFloat(e.target.value) || 0)}
                          style={{ width: 72 }}
                        />{' '}
                        {r.unit}
                      </td>
                      <td>{r.note ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Majorations par zone</h3>
          </div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Majoration</th>
                </tr>
              </thead>
              <tbody>
                {zoneRates.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ color: '#95A198', padding: '14px 8px' }}>
                      Aucune majoration de zone active.
                    </td>
                  </tr>
                ) : (
                  zoneRates.map((r) => (
                    <tr key={r.id}>
                      <td>{r.label}</td>
                      <td>
                        +{' '}
                        <input
                          className="rate-input"
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.amount}
                          onChange={(e) => updateAmount(r.id, parseFloat(e.target.value) || 0)}
                          style={{ width: 60 }}
                        />{' '}
                        {r.unit}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div
              style={{
                padding: '14px 8px 4px',
                fontSize: 11,
                color: '#95A198',
                lineHeight: 1.6,
              }}
            >
              Hors zone majorée, c&apos;est le taux de base du mode de paie qui s&apos;applique.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la grille'}
        </button>
        {saveState === 'ok' && (
          <span style={{ color: '#3F8F5B', fontSize: 12 }}>
            ✓ Grille enregistrée. La landing + les emails utilisent désormais ces taux.
          </span>
        )}
        {saveState === 'error' && (
          <span style={{ color: '#B33A3A', fontSize: 12 }}>
            Erreur : {fetchError}
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: '10px 12px',
          background: '#F3EEE3',
          borderRadius: 8,
          fontSize: 11,
          color: '#6B7C72',
          lineHeight: 1.6,
        }}
      >
        <b>Aperçu</b> — Taux horaire minimum affiché sur la landing :{' '}
        <b>
          {baseRates.length > 0
            ? `Dès ${fr(Math.min(...baseRates.filter((r) => r.mode === 'hourly').map((r) => r.amount)))} €/h`
            : '—'}
        </b>
      </div>
    </div>
  );
}
