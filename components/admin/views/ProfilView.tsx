'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAdminStore } from '@/lib/store';

export function ProfilView() {
  const { data: session, status } = useSession();
  const setCurrentView = useAdminStore((s) => s.setCurrentView);
  const { notifications, soundEnabled, setSoundEnabled } = useAdminStore();

  const name = session?.user?.name || 'Administrateur';
  const email = session?.user?.email || '—';
  const role = (session?.user as { role?: string } | undefined)?.role || 'ADMIN';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const recent = notifications.slice(0, 4);

  if (status === 'loading') {
    return (
      <div className="panel">
        <div className="panel-body">
          <p>Chargement du profil…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-stack">
      {/* Identité */}
      <div className="panel" style={{ maxWidth: 760 }}>
        <div className="panel-head">
          <h3>Informations personnelles</h3>
        </div>
        <div className="panel-body">
          <div className="profile-header">
            <div className="profile-avatar-lg">{initials}</div>
            <div>
              <h2 style={{ marginBottom: 4 }}>{name}</h2>
              <span className={`badge ${role === 'SUPER_ADMIN' ? 'b-client' : 'b-prospect'}`}>
                {role === 'SUPER_ADMIN' ? 'Super-administrateur' : 'Administrateur'}
              </span>
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <label>Nom complet</label>
              <div className="profile-value">{name}</div>
            </div>
            <div className="profile-field">
              <label>Adresse e-mail</label>
              <div className="profile-value">{email}</div>
            </div>
            <div className="profile-field">
              <label>Rôle</label>
              <div className="profile-value">
                {role === 'SUPER_ADMIN' ? 'Super-administrateur' : 'Administrateur'}
              </div>
            </div>
            <div className="profile-field">
              <label>Statut du compte</label>
              <div className="profile-value">
                <span className="badge b-client">Actif</span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn btn-ghost" onClick={() => setCurrentView('parametres')}>
              Paramètres du compte
            </button>
          </div>
        </div>
      </div>

      {/* Préférences notifications */}
      <div className="panel" style={{ maxWidth: 760 }}>
        <div className="panel-head">
          <h3>Notifications</h3>
        </div>
        <div className="panel-body">
          <p className="field-hint" style={{ marginBottom: 14 }}>
            Choisissez comment être alerté des nouvelles candidatures, missions et relances.
          </p>
          <div className="set-list">
            <div className="set-row">
              <div className="set-label">
                <b>Son à l&apos;ouverture de la cloche</b>
                <small>Joue une mélodie courte via la Web Audio API</small>
              </div>
              <ToggleSwitch on={soundEnabled} onChange={setSoundEnabled} />
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Alertes par e-mail</b>
                <small>Recevoir un e-mail pour chaque candidature entrante</small>
              </div>
              <ToggleSwitch defaultOn />
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Récapitulatif quotidien</b>
                <small>Synthèse des activité des agents à 18h00</small>
              </div>
              <ToggleSwitch defaultOn />
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Notifications WhatsApp</b>
                <small>Relances et validations critiques uniquement</small>
              </div>
              <ToggleSwitch defaultOn={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications récentes */}
      <div className="panel" style={{ maxWidth: 760 }}>
        <div className="panel-head">
          <h3>Notifications récentes</h3>
          <span className="link" onClick={() => setCurrentView('candidats')}>
            Voir tout
          </span>
        </div>
        <div className="panel-body" style={{ paddingTop: 8 }}>
          {recent.length === 0 ? (
            <p className="field-hint">Aucune notification pour le moment.</p>
          ) : (
            <div className="profile-notif-list">
              {recent.map((n) => (
                <div key={n.id} className={`profile-notif ${n.read ? '' : 'unread'}`}>
                  <span className={`notif-dot notif-${n.kind}`} />
                  <div>
                    <b>{n.title}</b>
                    <p>{n.body}</p>
                    <small>{n.time}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mini-toggle local (état interne), réutilisable. */
function ToggleSwitch({
  on,
  defaultOn,
  onChange,
}: {
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (v: boolean) => void;
}) {
  // Si `on` est fourni → contrôlé ; sinon état local avec defaultOn.
  const [local, setLocal] = useState(defaultOn ?? true);
  const isControlled = on !== undefined;
  const value = isControlled ? on! : local;
  function toggle() {
    if (!isControlled) setLocal((v) => !v);
    onChange?.(!value);
  }
  return (
    <div
      className={`mini-toggle ${value ? '' : 'off'}`}
      onClick={toggle}
      role="switch"
      aria-checked={value}
    >
      <div className="mini-knob" />
    </div>
  );
}
