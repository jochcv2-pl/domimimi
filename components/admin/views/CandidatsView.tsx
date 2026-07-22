'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../Modal';
import { Icon } from '@/components/ui/Icon';
import {
  Pipeline,
  PIPELINE_BADGE_CLS,
  PIPELINE_LABEL,
  type PipelineStatus,
} from '../Pipeline';
import { applicationToUiContact, type UiContact } from '@/lib/mappers';

// ============================================================
// Types locaux
// ============================================================

type Contact = UiContact;

type FetchState = 'loading' | 'success' | 'error';

// ============================================================
// Composant
// ============================================================

export function CandidatsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [fetchError, setFetchError] = useState<string>('');
  const [pipeFilter, setPipeFilter] = useState<PipelineStatus | 'tous'>('tous');

  // Modals & actions locales
  const [triOpen, setTriOpen] = useState(false);
  const [triRunning, setTriRunning] = useState(false);
  const [triDone, setTriDone] = useState(false);
  const [importName, setImportName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Action en cours (pour désactiver le bouton pendant la requête)
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>('');

  // ============================================================
  // Fetch initial
  // ============================================================

  const loadContacts = useCallback(async () => {
    setFetchState('loading');
    setFetchError('');
    try {
      const res = await fetch('/api/admin/applications?limit=100', {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const data = (json?.data ?? []) as Parameters<typeof applicationToUiContact>[0][];
      setContacts(data.map(applicationToUiContact));
      setFetchState('success');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erreur inconnue');
      setFetchState('error');
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // ============================================================
  // Dé rivés
  // ============================================================

  const pipeCounts = useMemo(() => {
    const base: Record<PipelineStatus, number> = {
      nouveau: 0,
      contacte: 0,
      encours: 0,
      offre: 0,
      attente: 0,
      client: 0,
      perdu: 0,
    };
    for (const c of contacts) base[c.pipe]++;
    return base;
  }, [contacts]);

  const visibleContacts = useMemo(
    () => (pipeFilter === 'tous' ? contacts : contacts.filter((c) => c.pipe === pipeFilter)),
    [contacts, pipeFilter]
  );

  // ============================================================
  // Actions — valider comme emballeur (pipe → client)
  // ============================================================

  async function validate(id: string) {
    setActionError('');
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipe: 'client' }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      const updated = applicationToUiContact(json.data);
      setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPendingId(null);
    }
  }

  async function reject(id: string) {
    setActionError('');
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipe: 'perdu', relanceStop: 'exclusion' }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      const updated = applicationToUiContact(json.data);
      setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPendingId(null);
    }
  }

  async function remove(id: string) {
    setActionError('');
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPendingId(null);
    }
  }

  // ============================================================
  // UI handlers
  // ============================================================

  function handleTri() {
    setTriRunning(true);
    setTriDone(false);
    setTimeout(() => {
      setTriRunning(false);
      setTriDone(true);
    }, 1800);
  }

  function closeTri() {
    setTriOpen(false);
    setTimeout(() => setTriDone(false), 200);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    setImportName(file.name);
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div>
      <Pipeline
        counts={pipeCounts}
        total={contacts.length}
        active={pipeFilter}
        onSelect={setPipeFilter}
      />

      <div className="info-band" style={{ marginTop: 20 }}>
        <div className="imark">i</div>
        <div>
          Un candidat entre comme <b>prospect</b> dès qu&apos;il remplit le formulaire de candidature.{' '}
          <b>Seul l&apos;administrateur</b> peut le valider comme emballeur — les agents IA n&apos;ont pas ce droit.
          La validation débloque le suivi complet et l&apos;attribution des missions.
        </div>
      </div>

      {actionError && (
        <div
          className="info-band"
          style={{
            marginTop: 12,
            background: '#FFF1F1',
            color: '#9B2C2C',
            borderLeft: '3px solid #C53030',
          }}
        >
          <div style={{ fontWeight: 600 }}>Erreur</div>
          <div>{actionError}</div>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-head">
            <h3>Importer des candidats</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 16 }}>
            <div
              className={`dropzone${dragOver ? ' drag' : ''}`}
              style={{ marginBottom: 0 }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0]);
              }}
            >
              <svg className="dz-ico" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              <div className="dz-title">Déposez un fichier .csv ou .xlsx</div>
              <div className="dz-sub">Colonnes attendues : nom, email, téléphone, ville, zone, disponibilité…</div>
              {importName && <div className="dz-file" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={13} color="#2E7D46" /> {importName}</div>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-head">
            <h3>Instructions de tri (IA)</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 16 }}>
            <p className="field-hint">
              Décrivez comment l&apos;IA doit trier et prioriser les candidats importés. Elle applique ces règles
              sans jamais contacter le candidat sans validation.
            </p>
            <textarea
              className="body-editor"
              style={{ minHeight: 120 }}
              defaultValue="Priorise les candidats situés dans une zone active et disponibles en journée. Classe en second ceux des zones en ouverture. Écarte les candidatures sans email valide. Marque en priorité haute les profils disposant d'un espace de stockage déclaré."
            />
            <button
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => setTriOpen(true)}
            >
              Trier avec l&apos;IA
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Tous les contacts</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a
              className="btn btn-secondary btn-sm"
              href={`/api/admin/applications/export${pipeFilter !== 'tous' ? `?pipe=${pipeFilter}` : ''}`}
              download
              style={{ textDecoration: 'none' }}
            >
              Exporter CSV
            </a>
            <span className="link">Filtrer</span>
          </div>
        </div>
        <div className="panel-body">
          {fetchState === 'loading' && <ContactsSkeleton />}
          {fetchState === 'error' && (
            <ContactsError
              message={fetchError}
              onRetry={loadContacts}
            />
          )}
          {fetchState === 'success' && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Candidat</th>
                    <th>Ville</th>
                    <th>Zone</th>
                    <th>Source</th>
                    <th>Reçu le</th>
                    <th>Relances</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleContacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="cust">
                          <div className="ini">{c.ini}</div>
                          <div>
                            <b>{c.name}</b>
                            <small>{c.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{c.city ?? c.postalCode}</td>
                      <td>{c.zone ?? ''}</td>
                      <td>{c.source}</td>
                      <td>{c.recu}</td>
                      <td>
                        <Relances data={c.relances} />
                      </td>
                      <td className="st">
                        <span className={`badge ${PIPELINE_BADGE_CLS[c.pipe]}`}>
                          {PIPELINE_LABEL[c.pipe]}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {c.pipe === 'client' ? (
                            <span style={{ fontSize: 11, color: '#95A198' }}>
                              {c.validatedBy?.name ? `Validé par ${c.validatedBy.name}` : 'Validé'}
                            </span>
                          ) : c.pipe === 'perdu' ? (
                            <span style={{ fontSize: 11, color: '#9B2C2C' }}>Rejeté</span>
                          ) : (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => validate(c.id)}
                                disabled={pendingId === c.id}
                              >
                                {pendingId === c.id ? '…' : 'Valider'}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => reject(c.id)}
                                disabled={pendingId === c.id}
                                style={{ color: '#9A6B1E' }}
                                title="Rejeter la candidature"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              if (window.confirm(`Supprimer définitivement ${c.name} ? Cette action est irréversible.`)) {
                                remove(c.id);
                              }
                            }}
                            disabled={pendingId === c.id}
                            style={{ color: '#C53030', fontSize: 11 }}
                            title="Supprimer définitivement"
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleContacts.length === 0 && (
                <p className="field-hint" style={{ textAlign: 'center', padding: '32px 0' }}>
                  Aucun candidat dans ce statut pour le moment.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        open={triOpen}
        onClose={closeTri}
        title="Tri intelligent des candidats"
        subtitle="L'IA classe et priorise les candidats selon vos instructions"
        footer={
          triDone ? (
            <button className="btn btn-primary" onClick={closeTri}>
              Terminé
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={closeTri}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleTri}
                disabled={triRunning}
              >
                {triRunning ? 'Tri en cours…' : 'Lancer le tri'}
              </button>
            </>
          )
        }
      >
        {triDone ? (
          <div className="tri-result">
            <div className="tri-ico">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p style={{ fontSize: '1.05rem', color: '#23282A' }}>
              Tri terminé. Les candidats ont été classés selon vos critères.
            </p>
            <div className="tri-stats">
              <div className="tri-stat">
                <div className="ts-num">3</div>
                <div className="ts-label">Priorité haute</div>
              </div>
              <div className="tri-stat">
                <div className="ts-num">2</div>
                <div className="ts-label">Priorité moyenne</div>
              </div>
              <div className="tri-stat">
                <div className="ts-num">1</div>
                <div className="ts-label">À écarter</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: 14, color: '#5E6B62' }}>
              L&apos;IA va analyser les candidats importés selon les instructions
              définies. Aucun candidat ne sera contacté sans votre validation.
            </p>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 14,
                fontSize: '0.88rem',
                color: '#5E6B62',
                lineHeight: 1.6,
              }}
            >
              <b>Règles appliquées :</b> priorisation par zone active,
              disponibilité en journée, écart des emails invalides.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// Sub-composants
// ============================================================

function Relances({ data }: { data: Contact['relances'] }) {
  if (data === 'valide') {
    return (
      <span className="rlz">
        <span className="na">validé</span>
      </span>
    );
  }
  const dots = Array.from({ length: data.total }, (_, i) => i < data.on);
  const full = data.on >= data.total;
  return (
    <span className={`rlz ${full ? 'full' : ''}`}>
      <span className="dots">
        {dots.map((on, i) => (
          <span key={i} className={`d ${on ? 'on' : ''}`}></span>
        ))}
      </span>{' '}
      {data.on}/{data.total}
    </span>
  );
}

function ContactsSkeleton() {
  return (
    <div style={{ padding: '8px 0' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 16,
            padding: '12px 0',
            borderBottom: '1px solid #f0eee9',
            opacity: 0.5,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e3dd' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: '30%', background: '#e5e3dd', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ height: 10, width: '40%', background: '#eeede8', borderRadius: 4 }} />
          </div>
        </div>
      ))}
      <p className="field-hint" style={{ textAlign: 'center', padding: '16px 0 0', color: '#95A198' }}>
        Chargement des candidatures…
      </p>
    </div>
  );
}

function ContactsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center' }}>
      <p style={{ color: '#9B2C2C', marginBottom: 12, fontSize: '0.95rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="warning" size={16} color="#9B2C2C" /> Impossible de charger les candidatures.
        </span>
      </p>
      <p style={{ color: '#95A198', fontSize: '0.85rem', marginBottom: 16 }}>
        {message}
      </p>
      <button className="btn btn-ghost" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}
