'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '../Modal';
import { Icon } from '@/components/ui/Icon';

type AgentKey = string;

type MemEntry = { key: string; val: string };

type Agent = {
  id: string;
  key: AgentKey;
  on: boolean;
  name: string;
  desc: string;
  avatar: string;
  subrole: string;
  prompt: string;
  memory: MemEntry[];
  custom?: boolean;
  sort?: number;
};

const EMPTY_AGENTS: Agent[] = [];

const TOOLS: { name: string; desc: string; on: boolean }[] = [
  { name: 'Lire une candidature', desc: 'Lecture seule', on: true },
  { name: 'Envoyer un email', desc: 'Modèles validés', on: true },
  { name: 'Envoyer WhatsApp', desc: 'Message sortant', on: true },
  { name: 'Valider un emballeur', desc: 'Réservé admin', on: false },
  { name: 'Escalade humaine', desc: 'Alerter le référent', on: true },
];

const GARDES = [
  { key: 'debit_max', val: "50 emails par heure, puis file d'attente." },
  { key: 'escalade_si', val: 'Question hors périmètre, réclamation, ou litige sur la paie.' },
  { key: 'format_sortie', val: 'JSON structuré validé avant envoi au client.' },
];

function Toggle({ initialOn, onChange }: { initialOn: boolean; onChange?: (on: boolean) => void }) {
  const [on, setOn] = useState(initialOn);
  return (
    <div
      className="toggle"
      onClick={() => {
        const next = !on;
        setOn(next);
        onChange?.(next);
      }}
    >
      <span>Actif</span>
      <div className={`toggle-track ${on ? '' : 'off'}`}>
        <div className="toggle-knob" />
      </div>
    </div>
  );
}

function MiniToggle({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  return (
    <div
      className={`mini-toggle ${on ? '' : 'off'}`}
      onClick={() => setOn((v) => !v)}
      role="switch"
      aria-checked={on}
    >
      <div className="mini-knob" />
    </div>
  );
}

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>(EMPTY_AGENTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [selected, setSelected] = useState<string>('');
  const [tab, setTab] = useState<'role' | 'memoire' | 'outils'>('role');

  // Prompts édités localement (key -> texte), poussés à la DB au save
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<{ key: string; state: 'ok' | 'error' } | null>(null);

  // Édition mémoire
  const [editingMem, setEditingMem] = useState<{ idx: number; key: string; val: string } | null>(
    null
  );
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');
  const [showNewMem, setShowNewMem] = useState(false);

  // Modal création agent
  const [createOpen, setCreateOpen] = useState(false);
  const [createDone, setCreateDone] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nName, setNName] = useState('');
  const [nSub, setNSub] = useState('');
  const [nDesc, setNDesc] = useState('');

  // ============================================================
  // Fetch initial
  // ============================================================

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/agents', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const raw = (json?.data ?? []).map((a: Agent & { active?: boolean }) => ({
        ...a,
        on: a.on ?? a.active ?? true,
        memory: Array.isArray(a.memory) ? a.memory : [],
      })) as Agent[];
      setAgents(raw);
      if (raw.length > 0 && !selected) setSelected(raw[0].key);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agent = agents.find((a) => a.key === selected) ?? agents[0];

  // ============================================================
  // Save agent (prompt + memory + toggle actif)
  // ============================================================

  const persistAgent = useCallback(async (id: string, patch: Partial<Agent> & { active?: boolean }) => {
    setSaving(true);
    setSaveState(null);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: [{ id, ...patch }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh local (on ignore `active` côté UI, on garde `on`)
      setAgents((prev) => prev.map((a) => {
        if (a.id !== id) return a;
        const { active: _active, ...rest } = patch;
        return { ...a, ...rest };
      }));
      const key = agents.find((a) => a.id === id)?.key ?? '';
      setSaveState({ key, state: 'ok' });
      setTimeout(() => setSaveState(null), 2500);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur');
      const key = agents.find((a) => a.id === id)?.key ?? '';
      setSaveState({ key, state: 'error' });
    } finally {
      setSaving(false);
    }
  }, [agents]);

  // ============================================================
  // Handlers mémoire (local + persistance au save global)
  // ============================================================

  function startEditMem(idx: number) {
    if (!agent) return;
    const list = agent.memory ?? [];
    const m = list[idx];
    if (!m) return;
    setEditingMem({ idx, key: m.key, val: m.val });
  }

  function saveEditMem() {
    if (!editingMem || !agent) return;
    const newMemory = agent.memory.map((m, i) =>
      i === editingMem.idx
        ? { key: editingMem.key.trim() || m.key, val: editingMem.val }
        : m
    );
    persistAgent(agent.id, { memory: newMemory });
    setEditingMem(null);
  }

  function deleteMem(idx: number) {
    if (!agent) return;
    const newMemory = agent.memory.filter((_, i) => i !== idx);
    persistAgent(agent.id, { memory: newMemory });
  }

  function addMem() {
    const k = newMemKey.trim();
    const v = newMemVal.trim();
    if (!k || !v || !agent) return;
    const newMemory = [...agent.memory, { key: k, val: v }];
    persistAgent(agent.id, { memory: newMemory });
    setNewMemKey('');
    setNewMemVal('');
    setShowNewMem(false);
  }

  // ============================================================
  // Création d'agent (POST)
  // ============================================================

  async function handleCreateAgent() {
    const name = nName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          desc: nDesc.trim() || undefined,
          subrole: nSub.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const created = json?.data as Agent & { active?: boolean };
      if (created) {
        const norm: Agent = {
          ...created,
          on: created.active ?? true,
          memory: Array.isArray(created.memory) ? created.memory : [],
        };
        setAgents((prev) => [...prev, norm]);
        setCreateDone(true);
        setTimeout(() => {
          setCreateOpen(false);
          setCreateDone(false);
          setSelected(norm.key);
          setTab('role');
          setNName('');
          setNSub('');
          setNDesc('');
        }, 900);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur création');
    } finally {
      setCreating(false);
    }
  }

  // ============================================================
  // Save prompt (champ textarea)
  // ============================================================

  const currentPrompt = editedPrompts[agent?.key ?? ''] ?? agent?.prompt ?? '';

  function updatePrompt(value: string) {
    if (!agent) return;
    setEditedPrompts((prev) => ({ ...prev, [agent.key]: value }));
  }

  function savePrompt() {
    if (!agent) return;
    const text = editedPrompts[agent.key];
    if (text === undefined) return;
    persistAgent(agent.id, { prompt: text });
  }

  function toggleAgentActive(next: boolean) {
    if (!agent) return;
    persistAgent(agent.id, { on: next, active: next });
  }

  // ============================================================
  // Loading / error state
  // ============================================================

  if (loading) {
    return <div style={{ padding: 24, color: '#5E6B62' }}>Chargement des agents…</div>;
  }
  if (loadError && agents.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: '#B33A3A', marginBottom: 12 }}>Erreur : {loadError}</div>
        <button className="btn btn-primary" onClick={load}>Réessayer</button>
      </div>
    );
  }
  if (!agent) {
    return <div style={{ padding: 24, color: '#5E6B62' }}>Aucun agent.</div>;
  }

  return (
    <div>
      <div className="agents-layout">
        <div className="agent-list">
          <div className="agent-list-head">
            <h3>Agents</h3>
            <button
              className="agent-add"
              title="Créer un agent"
              onClick={() => setCreateOpen(true)}
            >
              +
            </button>
          </div>
          {agents.map((a) => (
            <div
              key={a.key}
              className={`agent-item ${selected === a.key ? 'active' : ''}`}
              onClick={() => {
                setSelected(a.key);
                setEditingMem(null);
                setShowNewMem(false);
              }}
            >
              <div className="an">
                <span className={`status-dot ${a.on ? 'on' : 'off'}`}></span>
                <b>{a.name}</b>
              </div>
              <div className="adesc">{a.desc}</div>
            </div>
          ))}
        </div>
        <div className="agent-editor">
          <div className="ae-head">
            <div className="aeleft">
              <div className="ae-avatar">{agent.avatar}</div>
              <div>
                <h2>{agent.name}</h2>
                <div className="aerole">{agent.subrole}</div>
              </div>
            </div>
            <Toggle initialOn={agent.on} onChange={toggleAgentActive} />
          </div>
          <div className="ae-tabs">
            <div className={`ae-tab ${tab === 'role' ? 'active' : ''}`} onClick={() => setTab('role')}>
              Rôle
            </div>
            <div className={`ae-tab ${tab === 'memoire' ? 'active' : ''}`} onClick={() => setTab('memoire')}>
              Mémoire
            </div>
            <div className={`ae-tab ${tab === 'outils' ? 'active' : ''}`} onClick={() => setTab('outils')}>
              Fonctionnement
            </div>
          </div>
          <div className="ae-body">
            {tab === 'role' && (
              <div className="ae-tabpane active">
                <div className="field-title">Instruction système (rôle verrouillé)</div>
                <div className="field-hint">
                  Définit la mission et les limites. Non modifiable par le modèle ni le client — seul
                  l&apos;admin peut l&apos;éditer.
                </div>
                <textarea
                  className="code-area"
                  value={currentPrompt}
                  onChange={(e) => updatePrompt(e.target.value)}
                />
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    className="btn btn-primary"
                    onClick={savePrompt}
                    disabled={saving || editedPrompts[agent.key] === undefined}
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer le prompt'}
                  </button>
                  {saveState?.key === agent.key && saveState.state === 'ok' && (
                    <span style={{ color: '#3F8F5B', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={13} color="#3F8F5B" /> Prompt mis à jour. L&apos;agent utilise désormais cette version.
                    </span>
                  )}
                  {saveState?.key === agent.key && saveState.state === 'error' && (
                    <span style={{ color: '#B33A3A', fontSize: 12 }}>
                      Erreur : {loadError}
                    </span>
                  )}
                </div>
              </div>
            )}
            {tab === 'memoire' && (
              <div className="ae-tabpane active">
                <div className="field-title">Fichier mémoire</div>
                <div className="field-hint">
                  Connaissances et règles métier utilisées par l&apos;agent. Cliquez sur une ligne pour
                  modifier la clé ou la valeur. Ajout et suppression possibles à tout moment.
                </div>
                <div className="mem-list">
                  {(agent.memory ?? []).length === 0 && (
                    <div className="mem-empty">Aucune entrée mémoire. Ajoutez-en une ci-dessous.</div>
                  )}
                  {(agent.memory ?? []).map((m, idx) =>
                    editingMem && editingMem.idx === idx ? (
                      <div key={idx} className="mem-item mem-item-edit">
                        <input
                          className="mem-key-input"
                          value={editingMem.key}
                          onChange={(e) =>
                            setEditingMem({ ...editingMem, key: e.target.value })
                          }
                          placeholder="clé"
                        />
                        <input
                          className="mem-val-input"
                          value={editingMem.val}
                          onChange={(e) =>
                            setEditingMem({ ...editingMem, val: e.target.value })
                          }
                          placeholder="valeur"
                        />
                        <div className="mem-edit-actions">
                          <button className="mem-btn ok" onClick={saveEditMem} title="Enregistrer">
                            <Icon name="check" size={14} color="#2E7D46" />
                          </button>
                          <button
                            className="mem-btn cancel"
                            onClick={() => setEditingMem(null)}
                            title="Annuler"
                          >
                            <Icon name="x" size={14} color="#B23A2E" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="mem-item">
                        <span className="mem-key">{m.key}</span>
                        <span className="mem-val">{m.val}</span>
                        <div className="mem-actions">
                          <button
                            className="mem-btn edit"
                            onClick={() => startEditMem(idx)}
                            title="Modifier"
                          >
                            <Icon name="edit" size={14} color="#1E6FB8" />
                          </button>
                          <button
                            className="mem-btn del"
                            onClick={() => deleteMem(idx)}
                            title="Supprimer"
                          >
                            <Icon name="x" size={14} color="#B23A2E" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {showNewMem ? (
                  <div className="mem-add-form">
                    <input
                      className="mem-key-input"
                      value={newMemKey}
                      onChange={(e) => setNewMemKey(e.target.value)}
                      placeholder="nouvelle clé (ex. taux_base)"
                      autoFocus
                    />
                    <input
                      className="mem-val-input"
                      value={newMemVal}
                      onChange={(e) => setNewMemVal(e.target.value)}
                      placeholder="valeur"
                    />
                    <div className="mem-edit-actions">
                      <button className="mem-btn ok" onClick={addMem} title="Ajouter">
                        <Icon name="check" size={14} color="#2E7D46" />
                      </button>
                      <button
                        className="mem-btn cancel"
                        onClick={() => {
                          setShowNewMem(false);
                          setNewMemKey('');
                          setNewMemVal('');
                        }}
                        title="Annuler"
                      >
                        <Icon name="x" size={14} color="#B23A2E" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost mem-add-btn"
                    onClick={() => setShowNewMem(true)}
                  >
                    + Ajouter une entrée
                  </button>
                )}
              </div>
            )}
            {tab === 'outils' && (
              <div className="ae-tabpane active">
                <div className="field-title">Outils autorisés (liste blanche)</div>
                <div className="field-hint">L&apos;agent ne peut appeler que les fonctions activées ici.</div>
                <div className="tool-grid">
                  {TOOLS.map((t) => (
                    <div key={t.name} className="tool">
                      <div>
                        <div className="tool-name">{t.name}</div>
                        <div className="tool-desc">{t.desc}</div>
                      </div>
                      <MiniToggle initialOn={t.on} />
                    </div>
                  ))}
                </div>
                <div className="field-title" style={{ marginTop: 22 }}>
                  Garde-fous
                </div>
                <div className="field-hint">Limites appliquées automatiquement.</div>
                <div className="mem-list">
                  {GARDES.map((g) => (
                    <div key={g.key} className="mem-item">
                      <span className="mem-key">{g.key}</span>
                      <span className="mem-val">{g.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="ae-foot">
            <span className="saved">Dernière modification : {new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <button
              className="btn btn-primary"
              onClick={savePrompt}
              disabled={saving}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer l\'agent'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Création d'agent */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer un agent"
        subtitle="Définissez le nom et le rôle. Vous pourrez affiner le prompt et la mémoire ensuite."
        width={560}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateAgent}
              disabled={createDone || creating || !nName.trim()}
            >
              {createDone ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Agent créé <Icon name="check" size={14} color="#1E3A2F" /></span> : creating ? 'Création…' : 'Créer l\u2019agent'}
            </button>
          </>
        }
      >
        <div className="modal-field">
          <label htmlFor="ag-name">Nom de l&apos;agent</label>
          <input
            id="ag-name"
            type="text"
            value={nName}
            onChange={(e) => setNName(e.target.value)}
            placeholder="ex. Agent Support, Agent Onboarding…"
            autoFocus
          />
        </div>
        <div className="modal-field" style={{ marginTop: 14 }}>
          <label htmlFor="ag-sub">Sous-rôle (mission courte)</label>
          <input
            id="ag-sub"
            type="text"
            value={nSub}
            onChange={(e) => setNSub(e.target.value)}
            placeholder="ex. Accompagnement post-embauche"
          />
        </div>
        <div className="modal-field" style={{ marginTop: 14 }}>
          <label htmlFor="ag-desc">Description</label>
          <textarea
            id="ag-desc"
            value={nDesc}
            onChange={(e) => setNDesc(e.target.value)}
            placeholder="Ce que fait cet agent, en une phrase."
          />
        </div>
        <div className="info-band" style={{ marginTop: 16 }}>
          <div className="imark">i</div>
          <div>
            Le bloc <b>SÉCURITÉ</b> est automatiquement ajouté au prompt. La mémoire démarre vide —
            ajoutez les règles métier depuis l&apos;onglet « Mémoire ».
          </div>
        </div>
      </Modal>
    </div>
  );
}
