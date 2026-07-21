'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useAdminStore, VIEW_CONFIG } from '@/lib/store';
import Modal from './Modal';

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

const EXPORT_FORMATS: { id: ExportFormat; label: string; desc: string }[] = [
  { id: 'csv', label: 'CSV', desc: 'Fichier texte universel, ouvert dans Excel/Sheets' },
  { id: 'xlsx', label: 'Excel (.xlsx)', desc: 'Tableur Microsoft Excel avec mise en forme' },
  { id: 'pdf', label: 'PDF', desc: 'Rapport figé pour impression ou archivage' },
];

/**
 * Joue un son de notification via la Web Audio API (aucun fichier externe).
 * Fréquence montante douce · 2 notes courtes.
 */
function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1175, start: 0.1, dur: 0.16 },
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, now + n.start);
      gain.gain.linearRampToValueAtTime(0.18, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* Audio non disponible · silencieux */
  }
}

export function Topbar() {
  const { currentView, setCurrentView } = useAdminStore();
  const { data: session } = useSession();
  const config = VIEW_CONFIG[currentView];

  const { notifications, unreadCount, markAllRead, markRead, soundEnabled } = useAdminStore();

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFmt, setExportFmt] = useState<ExportFormat>('csv');
  const [exportDone, setExportDone] = useState(false);

  const [missionOpen, setMissionOpen] = useState(false);
  const [missionDone, setMissionDone] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const name = session?.user?.name || 'Thomas Bernard';
  const email = session?.user?.email || 'admin@domipack.fr';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Son à l'ouverture des notifications non lues
  useEffect(() => {
    if (notifOpen && unreadCount > 0 && soundEnabled) {
      playNotificationSound();
      markAllRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  // Ferme les dropdowns au clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleExport() {
    setExportDone(true);
    setTimeout(() => {
      setExportOpen(false);
      setExportDone(false);
    }, 1200);
  }

  function handleCreateMission() {
    setMissionDone(true);
    setTimeout(() => {
      setMissionOpen(false);
      setMissionDone(false);
    }, 1400);
  }

  function goTo(view: 'profil' | 'parametres') {
    setCurrentView(view);
    setAvatarOpen(false);
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>{config.title}</h1>
          <div className="sub">{config.sub}</div>
        </div>
        <div className="top-actions">
          <button className="btn btn-ghost" onClick={() => setExportOpen(true)}>
            Exporter
          </button>
          <button className="btn btn-primary" onClick={() => setMissionOpen(true)}>
            + Nouvelle mission
          </button>

          {/* Cloche notifications */}
          <div className="topbar-bell" ref={notifRef}>
            <button
              className="bell-btn"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path
                  d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.7 21a2 2 0 01-3.4 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {unreadCount > 0 && <span className="bell-dot">{unreadCount}</span>}
            </button>
            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-head">
                  <b>Notifications</b>
                  {notifications.length > 0 && (
                    <span className="link" onClick={markAllRead}>Tout marquer lu</span>
                  )}
                </div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <p className="notif-empty">Aucune notification</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.read ? '' : 'unread'}`}
                        onClick={() => markRead(n.id)}
                      >
                        <span className={`notif-dot notif-${n.kind}`} />
                        <div>
                          <b>{n.title}</b>
                          <p>{n.body}</p>
                          <small>{n.time}</small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar + dropdown */}
          <div className="topbar-avatar" ref={avatarRef}>
            <button
              className="avatar-trigger"
              onClick={() => setAvatarOpen((v) => !v)}
              aria-label="Menu compte"
            >
              <div className="avatar">{initials}</div>
            </button>
            {avatarOpen && (
              <div className="avatar-dropdown">
                <div className="avatar-info">
                  <b>{name}</b>
                  <small>{email}</small>
                </div>
                <hr />
                <button className="avatar-menu-item" onClick={() => goTo('profil')}>
                  Mon profil
                </button>
                <button className="avatar-menu-item" onClick={() => goTo('parametres')}>
                  Paramètres du compte
                </button>
                <hr />
                <button
                  className="avatar-menu-item danger"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Exporter */}
      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exporter les données"
        subtitle={`Format d'export pour la vue « ${config.title} »`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setExportOpen(false)}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleExport} disabled={exportDone}>
              {exportDone ? 'Export généré ✓' : 'Exporter'}
            </button>
          </>
        }
      >
        <div className="export-opts">
          {EXPORT_FORMATS.map((f) => (
            <div
              key={f.id}
              className={`export-opt ${exportFmt === f.id ? 'selected' : ''}`}
              onClick={() => setExportFmt(f.id)}
            >
              <span className="eo-radio" />
              <div>
                <div className="eo-label">{f.label}</div>
                <div className="eo-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-field" style={{ marginTop: 18 }}>
          <label htmlFor="export-range">Période</label>
          <select id="export-range" defaultValue="all">
            <option value="all">Toutes les données</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      </Modal>

      {/* Modal Nouvelle mission */}
      <Modal
        open={missionOpen}
        onClose={() => setMissionOpen(false)}
        title="Nouvelle mission"
        subtitle="Créez une mission d'emballage à attribuer aux emballeurs"
        width={580}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setMissionOpen(false)}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleCreateMission} disabled={missionDone}>
              {missionDone ? 'Mission créée ✓' : 'Créer la mission'}
            </button>
          </>
        }
      >
        <div className="modal-row-2">
          <div className="modal-field">
            <label htmlFor="m-title">Intitulé de la mission</label>
            <input id="m-title" type="text" placeholder="ex. Emballage colis textiles" />
          </div>
          <div className="modal-field">
            <label htmlFor="m-zone">Zone</label>
            <select id="m-zone">
              <option>Lyon Nord</option>
              <option>Paris Est</option>
              <option>Marseille Sud</option>
              <option>Nantes Ouest</option>
              <option>Toulouse Centre</option>
              <option>Lille Métropole</option>
            </select>
          </div>
        </div>
        <div className="modal-row-2">
          <div className="modal-field">
            <label htmlFor="m-mode">Mode de rémunération</label>
            <select id="m-mode">
              <option>à l&apos;heure</option>
              <option>Au colis</option>
            </select>
          </div>
          <div className="modal-field">
            <label htmlFor="m-rate">Taux (€)</label>
            <input id="m-rate" type="number" step="0.01" placeholder="12,50" />
          </div>
        </div>
        <div className="modal-row-2">
          <div className="modal-field">
            <label htmlFor="m-vol">Volume estimé</label>
            <input id="m-vol" type="number" placeholder="ex. 500 colis" />
          </div>
          <div className="modal-field">
            <label htmlFor="m-deadline">Date de collecte</label>
            <input id="m-deadline" type="date" />
          </div>
        </div>
        <div className="modal-field">
          <label htmlFor="m-notes">Consignes particulières</label>
          <textarea id="m-notes" placeholder="Type de carton, calage, étiquetage, fragilité" />
        </div>
      </Modal>
    </>
  );
}
