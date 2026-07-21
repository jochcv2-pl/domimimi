'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAdminStore } from '@/lib/store';

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

export function ParametresView() {
  const { data: session } = useSession();
  const myRole = (session?.user as { role?: string } | undefined)?.role || 'ADMIN';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { soundEnabled, setSoundEnabled } = useAdminStore();

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError('Impossible de charger les comptes. La base de données est-elle démarrée ?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormMsg({ type: 'err', text: data.error || 'Erreur lors de la création.' });
        return;
      }
      setFormMsg({ type: 'ok', text: `Compte créé : ${data.user.email}` });
      setForm({ name: '', email: '', password: '', role: 'ADMIN' });
      fetchUsers();
    } catch {
      setFormMsg({ type: 'err', text: 'Connexion impossible.' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Notifications */}
      <div className="panel" style={{ marginBottom: 20, maxWidth: 640 }}>
        <div className="panel-head">
          <h3>Notifications</h3>
        </div>
        <div className="panel-body">
          <div className="set-row">
            <div>
              <b>Son de notification</b>
              <p className="field-hint" style={{ margin: '4px 0 0' }}>
                Émet un son quand une nouvelle notification arrive.
              </p>
            </div>
            <button
              className={`toggle ${soundEnabled ? 'on' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label="Activer le son"
            >
              <span className="knob" />
            </button>
          </div>
        </div>
      </div>

      {/* Comptes admin */}
      <div className="panel" style={{ maxWidth: 640 }}>
        <div className="panel-head">
          <h3>Comptes administrateurs</h3>
        </div>
        <div className="panel-body">
          {loading ? (
            <p>Chargement…</p>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>E-mail</th>
                  <th>Rôle</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.name || '—'}</b></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'b-client' : 'b-prospect'}`}>
                        {u.role === 'SUPER_ADMIN' ? 'Super-admin' : 'Admin'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Ajouter un compte */}
      {myRole === 'SUPER_ADMIN' ? (
        <div className="panel" style={{ marginTop: 20, maxWidth: 640 }}>
          <div className="panel-head">
            <h3>Ajouter un compte admin</h3>
          </div>
          <div className="panel-body">
            {formMsg && (
              <p className={formMsg.type === 'ok' ? '' : 'form-error'} style={formMsg.type === 'ok' ? { color: '#2E7D46' } : {}}>
                {formMsg.text}
              </p>
            )}
            <form onSubmit={handleCreate} className="contact-form" style={{ gap: 14 }}>
              <div className="modal-row-2">
                <div className="modal-field">
                  <label htmlFor="a-name">Nom complet</label>
                  <input
                    id="a-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="ex. Thomas Bernard"
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="a-email">Adresse e-mail</label>
                  <input
                    id="a-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="admin@domipack.fr"
                  />
                </div>
              </div>
              <div className="modal-row-2">
                <div className="modal-field">
                  <label htmlFor="a-pass">Mot de passe (min. 8 caractères)</label>
                  <input
                    id="a-pass"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="a-role">Rôle</label>
                  <select
                    id="a-role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="ADMIN">Administrateur</option>
                    <option value="SUPER_ADMIN">Super-administrateur</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Création…' : 'Créer le compte'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ marginTop: 20, maxWidth: 640 }}>
          <div className="panel-body">
            <p className="field-hint">
              Seul un super-administrateur peut créer de nouveaux comptes admin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
