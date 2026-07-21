'use client';

import { useCallback, useEffect, useState } from 'react';

// ============================================================
// Types — miroir de /api/admin/pipeline/state
// ============================================================

type QueueNextUp = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
};

type QueueStep = {
  triggerKey: string;
  label: string;
  delayLabel: string;
  eligibleCount: number;
  nextUp: QueueNextUp[];
};

type RecentLog = {
  id: string;
  applicationId: string;
  trigger: string;
  templateName: string;
  toEmail: string;
  provider: string;
  status: 'sent' | 'failed' | 'bounced' | 'skipped';
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  candidate: { firstName: string; lastName: string; email: string } | null;
};

type PipelineState = {
  paused: boolean;
  provider: string;
  dailyCap: number;
  sentToday: number;
  queue: QueueStep[];
  recentLogs: RecentLog[];
};

// ============================================================
// Helpers
// ============================================================

function formatFr(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
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

function initials(first: string, last: string): string {
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function statusLabel(s: RecentLog['status']): string {
  switch (s) {
    case 'sent':
      return 'Envoyé';
    case 'failed':
      return 'Échec';
    case 'bounced':
      return 'Rebond';
    case 'skipped':
      return 'Ignoré';
  }
}

// ============================================================
// Composant principal
// ============================================================

export function PipelineView() {
  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState('');

  // Auto-refresh toutes les 30s (le pipeline bouge en continu via le cron)
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pipeline/state', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.data) setState(json.data as PipelineState);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  // Bascule pause / reprise
  const togglePause = useCallback(async () => {
    if (!state || toggling) return;
    setToggling(true);
    setToggleError('');
    const nextPaused = !state.paused;
    try {
      const res = await fetch('/api/admin/pipeline/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: nextPaused }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState((prev) => (prev ? { ...prev, paused: nextPaused } : prev));
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setToggling(false);
    }
  }, [state, toggling]);

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return <div style={{ padding: 24, color: '#5E6B62' }}>Chargement du pipeline…</div>;
  }

  if (!state) {
    return (
      <div style={{ padding: 24, color: '#B33A3A' }}>
        Impossible de charger l&apos;état du pipeline.
        {loadError && (
          <>
            <br />
            Détail : {loadError}
          </>
        )}
      </div>
    );
  }

  const totalEligible = state.queue.reduce((sum, s) => sum + s.eligibleCount, 0);
  const quotaUsedPct = state.dailyCap > 0 ? Math.round((state.sentToday / state.dailyCap) * 100) : 0;
  const lastLog = state.recentLogs[0] ?? null;

  return (
    <div>
      {loadError && (
        <div style={{ marginBottom: 12, color: '#C58A1B', fontSize: 12 }}>
          Rafraîchissement partiel : {loadError}
        </div>
      )}

      {/* ============================================================
          En-tête : statut + bouton pause/reprise d'urgence
          ============================================================ */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h3>État du pipeline</h3>
          <button
            className={`btn btn-sm ${state.paused ? 'btn-primary' : 'btn-danger'}`}
            onClick={togglePause}
            disabled={toggling}
            title={
              state.paused
                ? 'Le cron tourne mais n\'envoie rien. Cliquer pour reprendre.'
                : 'Arrêt immédiat de tout envoi (le cron continue de tourner).'
            }
          >
            {toggling
              ? 'Bascule…'
              : state.paused
                ? '▶ Reprendre les envois'
                : '⏸ Mettre en pause'}
          </button>
        </div>
        <div className="panel-body" style={{ paddingTop: 18 }}>
          <div className="pipe-head">
            <div className={`pipe-status ${state.paused ? 'is-paused' : 'is-live'}`}>
              <span className="pipe-dot" />
              <div>
                <b>{state.paused ? 'En pause' : 'Actif'}</b>
                <small>
                  {state.paused
                    ? 'Aucun email n\'est envoyé. Les candidats restent dans la file.'
                    : 'Le cron externe déclenche un cycle toutes les 60 s.'}
                </small>
              </div>
            </div>
            <div className="pipe-meta">
              <div className="pipe-meta-item">
                <span className="pipe-meta-label">Provider</span>
                <span className="pipe-meta-val">{state.provider}</span>
              </div>
              <div className="pipe-meta-item">
                <span className="pipe-meta-label">Quota du jour</span>
                <span className="pipe-meta-val">
                  {state.sentToday} / {state.dailyCap}
                </span>
              </div>
              <div className="pipe-meta-item">
                <span className="pipe-meta-label">File d&apos;attente</span>
                <span className="pipe-meta-val">{totalEligible} candidat{totalEligible > 1 ? 's' : ''}</span>
              </div>
              {lastLog && (
                <div className="pipe-meta-item">
                  <span className="pipe-meta-label">Dernier envoi</span>
                  <span className="pipe-meta-val">{formatFr(lastLog.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Barre quota */}
          <div className="pipe-quota" style={{ marginTop: 18 }}>
            <div className="pipe-quota-bar">
              <div
                className={`pipe-quota-fill ${quotaUsedPct >= 90 ? 'is-high' : ''}`}
                style={{ width: `${Math.min(quotaUsedPct, 100)}%` }}
              />
            </div>
            <span className="pipe-quota-label">{quotaUsedPct}% du quota quotidien utilisé</span>
          </div>

          {toggleError && (
            <div style={{ marginTop: 12, color: '#B33A3A', fontSize: 12 }}>
              Erreur bascule : {toggleError}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          Layout 2 colonnes : file d'attente + logs récents
          ============================================================ */}
      <div className="pipe-layout">
        {/* Colonne gauche — File d'attente par étape */}
        <div className="panel">
          <div className="panel-head">
            <h3>File d&apos;attente par étape</h3>
            <span className="field-hint" style={{ fontSize: 11 }}>
              {totalEligible} éligible{totalEligible > 1 ? 's' : ''} au prochain cycle
            </span>
          </div>
          <div className="panel-body" style={{ paddingTop: 8 }}>
            {state.queue.map((step) => (
              <div key={step.triggerKey} className="pipe-step">
                <div className="pipe-step-head">
                  <div>
                    <b>{step.label}</b>
                    <small>Éligible à {step.delayLabel}</small>
                  </div>
                  <span className={`pipe-count ${step.eligibleCount > 0 ? 'has' : ''}`}>
                    {step.eligibleCount}
                  </span>
                </div>
                {step.eligibleCount === 0 ? (
                  <div className="pipe-step-empty">Aucun candidat en attente.</div>
                ) : (
                  <ul className="pipe-step-list">
                    {step.nextUp.map((c) => (
                      <li key={c.id}>
                        <span className="pipe-avatar">{initials(c.firstName, c.lastName)}</span>
                        <span className="pipe-name">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="pipe-email">{c.email}</span>
                        <span className="pipe-since">depuis {formatFr(c.createdAt)}</span>
                      </li>
                    ))}
                    {step.eligibleCount > step.nextUp.length && (
                      <li className="pipe-more">
                        + {step.eligibleCount - step.nextUp.length} autre
                        {step.eligibleCount - step.nextUp.length > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite — Logs récents */}
        <div className="panel">
          <div className="panel-head">
            <h3>Envois récents</h3>
            <span className="field-hint" style={{ fontSize: 11 }}>
              30 derniers
            </span>
          </div>
          <div className="panel-body" style={{ paddingTop: 4 }}>
            {state.recentLogs.length === 0 ? (
              <div className="pipe-step-empty" style={{ padding: '24px 0' }}>
                Aucun envoi enregistré pour le moment.
                <br />
                <span style={{ color: '#8B968D' }}>
                  Le premier cycle envoyé apparaîtra ici automatiquement.
                </span>
              </div>
            ) : (
              <ul className="pipe-logs">
                {state.recentLogs.map((log) => (
                  <li key={log.id} className="pipe-log-row">
                    <span className={`pipe-log-status is-${log.status}`}>
                      {statusLabel(log.status)}
                    </span>
                    <div className="pipe-log-body">
                      <div className="pipe-log-line">
                        <b>
                          {log.candidate
                            ? `${log.candidate.firstName} ${log.candidate.lastName}`
                            : 'Candidat supprimé'}
                        </b>
                        <span className="pipe-log-trigger">{log.trigger}</span>
                      </div>
                      <div className="pipe-log-sub">
                        {log.toEmail} · {log.provider} · {formatFr(log.createdAt)}
                      </div>
                      {log.error && (
                        <div className="pipe-log-err">{log.error}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
