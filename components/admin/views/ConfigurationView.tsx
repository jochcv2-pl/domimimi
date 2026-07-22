'use client';

import { useCallback, useEffect, useState } from 'react';

type Settings = Record<string, string>;
type Secrets = Record<string, boolean>;

type ProvKey = 'resend' | 'brevo' | 'smtp';

const PROVIDERS: {
  key: ProvKey;
  name: string;
  secretKey: string; // variable .env attendue
}[] = [
  { key: 'resend', name: 'Resend',          secretKey: 'EMAIL_RESEND_API_KEY' },
  { key: 'brevo',  name: 'Brevo',           secretKey: 'EMAIL_BREVO_API_KEY' },
  { key: 'smtp',   name: 'SMTP Hostinger',  secretKey: 'EMAIL_SMTP_HOST' },
];

const AI_MODELS = ['qwen3-8b', 'qwen3-4b', 'gemma-4-12b', 'mistral-small-4', 'phi-4-mini'];
const AI_ENGINES = ['ollama', 'vllm', 'lmstudio'];

/**
 * Bouton "Enregistrer" avec feedback visuel.
 * Doit être défini HORS du composant parent pour ne pas reset son état
 * à chaque render (cf. react-hooks/static-components).
 */
function SaveButton({
  label,
  savingKey,
  savedKeys,
  loadError,
  onSave,
}: {
  label: string;
  savingKey: string | null;
  savedKeys: Record<string, 'ok' | 'error'>;
  loadError: string;
  onSave: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <button
        className="btn btn-primary"
        onClick={onSave}
        disabled={savingKey === label}
      >
        {savingKey === label ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {savedKeys[label] === 'ok' && (
        <span style={{ color: '#3F8F5B', fontSize: 12 }}>✓ Enregistré</span>
      )}
      {savedKeys[label] === 'error' && (
        <span style={{ color: '#B33A3A', fontSize: 12 }}>Erreur : {loadError}</span>
      )}
    </div>
  );
}

export function ConfigurationView() {
  const [settings, setSettings] = useState<Settings>({});
  const [secrets, setSecrets] = useState<Secrets>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Record<string, 'ok' | 'error'>>({});

  // ============================================================
  // Fetch
  // ============================================================

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [s1, s2] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }),
        fetch('/api/admin/secrets-status', { cache: 'no-store' }),
      ]);
      if (!s1.ok) throw new Error(`HTTP ${s1.status}`);
      const sj = await s1.json();
      setSettings(sj?.data ?? {});
      if (s2.ok) {
        const ssj = await s2.json();
        setSecrets(ssj?.data ?? {});
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ============================================================
  // Save bulk par groupe
  // ============================================================

  const saveKeys = useCallback(async (keys: string[], label: string) => {
    setSavingKey(label);
    try {
      const payload = keys
        .filter((k) => settings[k] !== undefined)
        .map((k) => ({ key: k, value: String(settings[k]) }));
      if (payload.length === 0) return;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedKeys((prev) => ({ ...prev, [label]: 'ok' }));
      setTimeout(() => setSavedKeys((prev) => {
        const n = { ...prev };
        delete n[label];
        return n;
      }), 2500);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur');
      setSavedKeys((prev) => ({ ...prev, [label]: 'error' }));
    } finally {
      setSavingKey(null);
    }
  }, [settings]);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div style={{ padding: 24, color: '#5E6B62' }}>Chargement de la configuration…</div>;
  }
  if (loadError && Object.keys(settings).length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: '#B33A3A', marginBottom: 12 }}>Erreur : {loadError}</div>
        <button className="btn btn-primary" onClick={load}>Réessayer</button>
      </div>
    );
  }

  const activeProv = (settings['email.provider_active'] ?? 'resend') as ProvKey;

  return (
    <div>
      <div className="set-grid">
        {/* Modèle d'IA */}
        <div className="panel">
          <div className="panel-head">
            <h3>Modèle d&apos;IA</h3>
            <span className="link">Tester la connexion</span>
          </div>
          <div className="panel-body" style={{ paddingTop: 16 }}>
            <p className="field-hint">
              Connectez, configurez et changez le modèle depuis ici. Le CRM parle au modèle via une API
              compatible OpenAI, donc vous pouvez en changer sans toucher au reste.
            </p>
            <div className="frow">
              <div className="fg">
                <label>Modèle actif</label>
                <select
                  value={settings['ai.model'] ?? 'qwen3-8b'}
                  onChange={(e) => update('ai.model', e.target.value)}
                >
                  {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Moteur</label>
                <select
                  value={settings['ai.provider'] ?? 'ollama'}
                  onChange={(e) => update('ai.provider', e.target.value)}
                >
                  {AI_ENGINES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Adresse du serveur (endpoint)</label>
                <input
                  value={settings['ai.endpoint'] ?? ''}
                  onChange={(e) => update('ai.endpoint', e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Clé API (en .env)</label>
                <input
                  type="password"
                  placeholder={secrets['AI_API_KEY'] ? '•••• configurée en .env' : 'non configurée'}
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <small style={{ fontSize: 10, color: '#95A198' }}>
                  La clé API est stockée dans <code>.env</code> (variable <code>AI_API_KEY</code>).
                  Optionnelle pour Ollama local.
                </small>
              </div>
              <div className="fg">
                <label>Température</label>
                <input
                  value={settings['ai.temperature'] ?? '0.3'}
                  onChange={(e) => update('ai.temperature', e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Jetons max</label>
                <input
                  value={settings['ai.max_tokens'] ?? '2048'}
                  onChange={(e) => update('ai.max_tokens', e.target.value)}
                />
              </div>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>État</b>
                <small>Connexion au modèle</small>
              </div>
              <span className="pill-on">En ligne</span>
            </div>
            <SaveButton label="ia" savingKey={savingKey} savedKeys={savedKeys} loadError={loadError} onSave={() => saveKeys(['ai.model', 'ai.provider', 'ai.endpoint', 'ai.temperature', 'ai.max_tokens'], 'ia')} />
          </div>
        </div>

        {/* Sécurité des agents */}
        <div className="panel">
          <div className="panel-head">
            <h3>Sécurité des agents</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <p className="field-hint">
              Règles appliquées à <b>tous</b> les agents, non désactivables. Elles s&apos;ajoutent au bridage de
              chaque rôle.
            </p>
            {[
              ['Rester dans le rôle et le contexte', 'Aucune sortie du périmètre défini'],
              ['Confidentialité des données', 'Ne jamais transmettre de données clients/admin'],
              ['Refus des jeux / détournements', 'Avec un inconnu comme avec un admin'],
              ['Respect des limites', 'Jamais de dépassement des garde-fous'],
              ['Filtre entrée / sortie', 'Contrôle avant et après le modèle'],
            ].map(([t, d]) => (
              <div key={t} className="set-row">
                <div className="set-label">
                  <b>{t}</b>
                  <small>{d}</small>
                </div>
                <span className="pill-on">Verrouillé</span>
              </div>
            ))}
          </div>
        </div>

        {/* Couche de bridage */}
        <div className="panel">
          <div className="panel-head">
            <h3>Couche de bridage</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 14 }}>
            {[
              ['System prompt verrouillé', 'Rôles protégés'],
              ['Sorties structurées', 'Format JSON imposé'],
              ['Liste blanche d\'outils', 'Par agent'],
            ].map(([t, d]) => (
              <div key={t} className="set-row">
                <div className="set-label">
                  <b>{t}</b>
                  <small>{d}</small>
                </div>
                <span className="pill-on">Activé</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cadence d'envoi */}
        <div className="panel">
          <div className="panel-head">
            <h3>Cadence d&apos;envoi (anti-spam)</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <p className="field-hint">
              Le CRM planifie les envois avec des limites strictes pour protéger la réputation du domaine.
              L&apos;IA propose une cadence, le système l&apos;applique dans ces bornes.
            </p>
            <div className="set-row">
              <div className="set-label">
                <b>Montée en charge (warm-up)</b>
                <small>Volume progressif les 4 premières semaines</small>
              </div>
              <span className="pill-on">Activé</span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Plafond quotidien</b>
                <small>Emails max par jour</small>
              </div>
              <span className="set-val">
                <input
                  className="rate-input"
                  value={settings['email.cadence.daily_cap'] ?? '200'}
                  onChange={(e) => update('email.cadence.daily_cap', e.target.value)}
                  style={{ width: 60, textAlign: 'center' }}
                />{' '}
                / jour
              </span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Intervalle entre envois</b>
                <small>Espacement aléatoire</small>
              </div>
              <span className="set-val">30–90 s</span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>IP dédiée / VPS</b>
                <small>Réputation stable (déconseillé : VPN rotatif)</small>
              </div>
              <select
                className="set-select"
                value={settings['email.cadence.ip_type'] ?? 'shared'}
                onChange={(e) => update('email.cadence.ip_type', e.target.value)}
              >
                <option value="shared">IP partagée (ESP)</option>
                <option value="dedicated">IP dédiée (ESP)</option>
                <option value="vps">VPS + IP dédiée</option>
              </select>
            </div>
            <SaveButton label="cadence" savingKey={savingKey} savedKeys={savedKeys} loadError={loadError} onSave={() => saveKeys(['email.cadence.daily_cap', 'email.cadence.ip_type'], 'cadence')} />
          </div>
        </div>

        {/* Règles d'arrêt des relances */}
        <div className="panel">
          <div className="panel-head">
            <h3>Règles d&apos;arrêt des relances</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <p className="field-hint">
              À chaque passage, l&apos;Agent Relance ne reçoit que les candidats encore « en attente » et dans la
              fenêtre autorisée. Dès qu&apos;une règle ci-dessous s&apos;applique, le candidat sort de la file — l&apos;IA ne
              décide rien et ne lit aucun email.
            </p>
            <div className="set-row">
              <div className="set-label">
                <b>Nombre max de relances</b>
                <small>Au-delà : statut « sans réponse / clos »</small>
              </div>
              <span className="set-val">
                <input
                  className="rate-input"
                  value={settings['relance.max_count'] ?? '3'}
                  onChange={(e) => update('relance.max_count', e.target.value)}
                  style={{ width: 46, textAlign: 'center' }}
                />{' '}
                max
              </span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Cadence des envois</b>
                <small>Espacement, jamais plus rapproché</small>
              </div>
              <span className="set-val">J+3 · J+6 · J+9</span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Fenêtre de validation</b>
                <small>Sans validation admin dans ce délai → clôture</small>
              </div>
              <span className="set-val">
                <input
                  className="rate-input"
                  value={settings['relance.validation_window_days'] ?? '10'}
                  onChange={(e) => update('relance.validation_window_days', e.target.value)}
                  style={{ width: 46, textAlign: 'center' }}
                />{' '}
                jours
              </span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Modèle par relance</b>
                <small>Chaque relance utilise un modèle différent du précédent</small>
              </div>
              <span className="pill-on">Imposé</span>
            </div>
            <div
              className="info-band"
              style={{ margin: '14px 0 0', background: '#F3F5EE', color: '#5E6B62' }}
            >
              <div className="imark" style={{ background: '#DDE1D6', color: '#5E6B62' }}>
                i
              </div>
              <div>
                Arrêt immédiat, <b>sans lecture d&apos;email</b> : validé emballeur · désinscription (STOP) · email
                invalide (bounce) · exclusion manuelle. Une réponse par email n&apos;arrête pas la séquence
                automatiquement — elle arrive dans la boîte du référent, qui valide ou exclut le candidat à la
                main.
              </div>
            </div>
            <SaveButton label="relance" savingKey={savingKey} savedKeys={savedKeys} loadError={loadError} onSave={() => saveKeys(['relance.max_count', 'relance.validation_window_days'], 'relance')} />
          </div>
        </div>

        {/* Passerelles d'envoi */}
        <div className="panel">
          <div className="panel-head">
            <h3>Passerelles d&apos;envoi</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <p className="field-hint">
              Sélectionnez le fournisseur <b>Actif</b> et renseignez ses identifiants ci-dessous.
              Les valeurs saisies ici sont <b>stockées en base</b> et priment sur le <code>.env</code>.
            </p>

            {/* Provider selection */}
            {PROVIDERS.map((p) => {
              const isActive = activeProv === p.key;
              const isConfigured = !!secrets[p.secretKey];
              return (
                <div key={p.key} className={`prov ${isActive ? 'active-prov' : ''}`}>
                  <div className="prov-head">
                    <label className="prov-radio">
                      <input
                        type="radio"
                        name="prov"
                        checked={isActive}
                        onChange={() => update('email.provider_active', p.key)}
                      />
                      <b>{p.name}</b>
                    </label>
                    {isActive ? (
                      <span className="prov-badge">Actif</span>
                    ) : (
                      <span className="prov-badge-off">Inactif</span>
                    )}
                  </div>

                  {/* Credential inputs per provider */}
                  {p.key === 'smtp' && (
                    <div className="frow" style={{ marginBottom: 0, marginTop: 12 }}>
                      <div className="fg">
                        <label>Hôte SMTP</label>
                        <input
                          value={settings['email.smtp_host'] ?? ''}
                          onChange={(e) => update('email.smtp_host', e.target.value)}
                          placeholder="smtp.hostinger.com"
                        />
                      </div>
                      <div className="fg" style={{ maxWidth: 100 }}>
                        <label>Port</label>
                        <input
                          value={settings['email.smtp_port'] ?? '587'}
                          onChange={(e) => update('email.smtp_port', e.target.value)}
                          placeholder="587"
                        />
                      </div>
                      <div className="fg">
                        <label>Utilisateur</label>
                        <input
                          value={settings['email.smtp_user'] ?? ''}
                          onChange={(e) => update('email.smtp_user', e.target.value)}
                          placeholder="contact@domaine.fr"
                        />
                      </div>
                      <div className="fg">
                        <label>Mot de passe</label>
                        <input
                          type="password"
                          value={settings['email.smtp_pass'] ?? ''}
                          onChange={(e) => update('email.smtp_pass', e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}
                  {p.key === 'resend' && (
                    <div className="frow" style={{ marginBottom: 0, marginTop: 12 }}>
                      <div className="fg">
                        <label>Clé API Resend</label>
                        <input
                          type="password"
                          value={settings['email.resend_api_key'] ?? ''}
                          onChange={(e) => update('email.resend_api_key', e.target.value)}
                          placeholder="re_••••••••"
                        />
                      </div>
                    </div>
                  )}
                  {p.key === 'brevo' && (
                    <div className="frow" style={{ marginBottom: 0, marginTop: 12 }}>
                      <div className="fg">
                        <label>Clé API Brevo</label>
                        <input
                          type="password"
                          value={settings['email.brevo_api_key'] ?? ''}
                          onChange={(e) => update('email.brevo_api_key', e.target.value)}
                          placeholder="xkeysib-••••••••"
                        />
                      </div>
                    </div>
                  )}

                  {/* .env fallback indicator */}
                  <div style={{ marginTop: 8, fontSize: 11, color: '#95A198' }}>
                    {isConfigured ? (
                      <>Fallback <code>.env</code> : <span className="pill-on" style={{ fontSize: 10 }}>✓ {p.secretKey}</span></>
                    ) : (
                      <>Pas de fallback <code>.env</code> pour <code>{p.secretKey}</code></>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Email de notification */}
            <div className="fg" style={{ marginTop: 16, marginBottom: 0 }}>
              <label>Email de notification interne</label>
              <input
                value={settings['email.notify_to'] ?? ''}
                onChange={(e) => update('email.notify_to', e.target.value)}
                placeholder="recrutement@domaine.fr"
                style={{ fontFamily: 'monospace' }}
              />
              <small style={{ fontSize: 10, color: '#95A198' }}>
                Adresse qui reçoit les notifications de nouvelles candidatures.
                Remplace la variable <code>NOTIFY_EMAIL_TO</code> du <code>.env</code>.
              </small>
            </div>

            <div className="set-row" style={{ marginTop: 12 }}>
              <div className="set-label">
                <b>SPF / DKIM / DMARC</b>
                <small>Authentification du domaine actif</small>
              </div>
              <span className="pill-on">Vérifié</span>
            </div>
            <SaveButton label="provider" savingKey={savingKey} savedKeys={savedKeys} loadError={loadError} onSave={() => saveKeys([
              'email.provider_active',
              'email.smtp_host', 'email.smtp_port', 'email.smtp_user', 'email.smtp_pass',
              'email.resend_api_key', 'email.brevo_api_key',
              'email.notify_to',
            ], 'provider')} />
          </div>
        </div>

        {/* Réponses des candidats */}
        <div className="panel">
          <div className="panel-head">
            <h3>Réponses des candidats</h3>
          </div>
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <div
              className="info-band"
              style={{ margin: '0 0 14px', background: '#F3F5EE', color: '#5E6B62' }}
            >
              <div className="imark" style={{ background: '#DDE1D6', color: '#5E6B62' }}>
                i
              </div>
              <div>
                Les agents IA ne font que le <b>recrutement sortant</b>. Ils ne lisent pas et ne répondent pas
                aux emails des candidats.
              </div>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Réponses reçues</b>
                <small>Destination des réponses</small>
              </div>
              <span className="set-val">Boîte du référent</span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Lecture par l&apos;IA</b>
                <small>Emails entrants</small>
              </div>
              <span className="pill-off">Désactivé</span>
            </div>
            <div className="set-row">
              <div className="set-label">
                <b>Réponse automatique IA</b>
                <small>Sur emails entrants</small>
              </div>
              <span className="pill-off">Désactivé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
