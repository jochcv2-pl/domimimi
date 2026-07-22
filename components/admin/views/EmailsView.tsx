'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Modal from '../Modal';
import { Icon } from '@/components/ui/Icon';
import { sanitizeHtml } from '@/lib/sanitize';

// CodeMirror est chargé dynamiquement (client-only, pas de SSR)
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });
import { html as htmlLang } from '@codemirror/lang-html';

const VARS = [
  '{{Prénom}}',
  '{{Nom}}',
  '{{Ville}}',
  '{{Zone}}',
  '{{Mode de paie}}',
  '{{Taux horaire}}',
  '{{Cadence}}',
  '{{Date de collecte}}',
  '{{Date}}',
  '{{Date de début}}',
  '{{Situation}}',
  '{{Prénom du référent}}',
];

const SAMPLE: Record<string, string> = {
  '{{Prénom}}': 'Marie',
  '{{Nom}}': 'Lefèvre',
  '{{Ville}}': 'Lyon',
  '{{Zone}}': 'Lyon Nord',
  '{{Mode de paie}}': "à l'heure",
  '{{Taux horaire}}': '12,50 €',
  '{{Cadence}}': '≈ 15 colis/h',
  '{{Date de collecte}}': '22 juillet 2026',
  '{{Date}}': '15 juillet 2026',
  '{{Date de début}}': '20 juillet 2026',
  '{{Situation}}': 'Disponible en journée',
  '{{Prénom du référent}}': 'Thomas',
};

type Template = {
  id: string;
  name: string;
  trigger: string;
  agentKey: string | null;
  subject: string;
  body: string;
  status: 'actif' | 'brouillon' | 'archive';
  sort: number;
  // champs UI dérivés (non stockés)
  badge?: string;
  label?: string;
  langs?: number;
  excerpt?: string;
  vars?: string[];
};

const EMPTY_TEMPLATES: Template[] = [];

const LANG_TAGS = ['FR', 'EN', 'DE', 'ES', 'PT', 'IT'];

/** Pied de page email par défaut — utilisé tant que la DB n'a pas chargé. */
const DEFAULT_FOOTER = {
  companyName: 'Domipack',
  tagline: 'Recrutement d\'emballeurs à domicile',
  addressLine: '12 rue des Ateliers, 69007 Lyon, France',
  email: 'recrutement@domipack.fr',
  phone: '+33 4 78 00 00 00',
  legal:
    'Cet email vous est envoyé suite à votre candidature. Vos données sont traitées conformément au RGPD. Pour vous désinscrire, répondez STOP.',
};

// Dérive les champs UI (badge/label/excerpt/vars) depuis les champs DB.
function decorate(t: Template): Template {
  const isBrouillon = t.status === 'brouillon';
  const isArchive = t.status === 'archive';
  return {
    ...t,
    badge: isBrouillon ? 'b-wait' : isArchive ? 'b-wait' : 'b-offer',
    label: isBrouillon ? 'Brouillon' : isArchive ? 'Archive' : 'Actif',
    langs: 6,
    excerpt: t.body?.slice(0, 120).replace(/\s+/g, ' ').trim() + '…',
    vars: VARS.filter((v) => (t.body ?? '').includes(v) || (t.subject ?? '').includes(v)),
  };
}

function escapeHtml(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Surligne les variables dans un texte, en mode données réelles ou variables brutes. */
function fill(text: string, previewMode: 'data' | 'raw') {
  let out = escapeHtml(text);
  VARS.forEach((v) => {
    const val = previewMode === 'data' ? SAMPLE[v] ?? v : v;
    out = out.split(v).join(`<span class="hl">${escapeHtml(val)}</span>`);
  });
  return out;
}

export function EmailsView() {
  const [subview, setSubview] = useState<'generer' | 'liste'>('liste');
  const [mode, setMode] = useState<'visuel' | 'import'>('visuel');
  const [previewMode, setPreviewMode] = useState<'data' | 'raw'>('data');
  const [subj, setSubj] = useState('Votre candidature a bien été reçue, {{Prénom}}');
  const [body, setBody] = useState(
    `Bonjour {{Prénom}},

Nous avons bien reçu votre candidature pour l'emballage à domicile dans la zone {{Zone}}. Votre référent {{Prénom du référent}} étudie votre profil et vous rappelle sous 48 heures. Aucun frais ne vous sera jamais demandé.

À très bientôt,
{{Prénom du référent}} — Référent recrutement, Domipack`
  );

  // Mode import
  const [htmlArea, setHtmlArea] = useState('');
  const [importName, setImportName] = useState('');
  const [fileName, setFileName] = useState('');

  // Liste : templates chargés depuis la DB
  const [templates, setTemplates] = useState<Template[]>(EMPTY_TEMPLATES);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Édition du template courant (vue générateur)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('Confirmation de candidature');
  const [editingTrigger, setEditingTrigger] = useState('Candidature reçue');
  const [savingTpl, setSavingTpl] = useState(false);
  const [saveTplState, setSaveTplState] = useState<'idle' | 'ok' | 'error'>('idle');

  // Pied de page éditable (chargé depuis setting email.footer)
  const [footer, setFooter] = useState(DEFAULT_FOOTER);
  const [footerOpen, setFooterOpen] = useState(false);
  const [footerSaving, setFooterSaving] = useState(false);

  // Plein écran preview (visuel)
  const [fullVisuel, setFullVisuel] = useState(false);
  // Plein écran preview (import / iframe)
  const [fullIframe, setFullIframe] = useState(false);

  // ============================================================
  // Fetch initial : templates + footer
  // ============================================================

  const loadAll = useCallback(async () => {
    setTplLoading(true);
    setTplError('');
    try {
      const [tplRes, setRes] = await Promise.all([
        fetch('/api/admin/email-templates', { cache: 'no-store' }),
        fetch('/api/admin/settings', { cache: 'no-store' }),
      ]);
      if (!tplRes.ok) throw new Error(`HTTP ${tplRes.status}`);
      const tplJson = await tplRes.json();
      const raw = (tplJson?.data ?? []) as Template[];
      setTemplates(raw.map(decorate));

      if (setRes.ok) {
        const setJson = await setRes.json();
        const map: Record<string, string> = setJson?.data ?? {};
        if (map['email.footer']) {
          try {
            const parsed = JSON.parse(map['email.footer']);
            setFooter({ ...DEFAULT_FOOTER, ...parsed });
          } catch {
            /* keep default */
          }
        }
      }
    } catch (err) {
      setTplError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setTplLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ============================================================
  // Save template (générateur)
  // ============================================================

  const saveTemplate = useCallback(async () => {
    setSavingTpl(true);
    setSaveTplState('idle');
    try {
      if (editingId) {
        // Update
        const res = await fetch('/api/admin/email-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templates: [{
              id: editingId,
              name: editingName,
              trigger: editingTrigger,
              subject: subj,
              body,
            }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Refresh local
        setTemplates((prev) => prev.map((t) =>
          t.id === editingId
            ? decorate({ ...t, name: editingName, trigger: editingTrigger, subject: subj, body })
            : t
        ));
      } else {
        // Create
        const res = await fetch('/api/admin/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingName,
            trigger: editingTrigger,
            subject: subj,
            body,
            status: 'actif',
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const created = json?.data as Template;
        if (created) {
          setTemplates((prev) => [...prev, decorate(created)]);
          setEditingId(created.id);
        }
      }
      setSaveTplState('ok');
      setTimeout(() => setSaveTplState('idle'), 2500);
    } catch (err) {
      setTplError(err instanceof Error ? err.message : 'Erreur');
      setSaveTplState('error');
    } finally {
      setSavingTpl(false);
    }
  }, [editingId, editingName, editingTrigger, subj, body]);

  // ============================================================
  // Delete template
  // ============================================================

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setTplError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  // ============================================================
  // Save footer (setting email.footer)
  // ============================================================

  const saveFooter = useCallback(async () => {
    setFooterSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [{
            key: 'email.footer',
            value: JSON.stringify(footer),
          }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFooterOpen(false);
    } catch (err) {
      setTplError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setFooterSaving(false);
    }
  }, [footer]);

  // ============================================================
  // Edit existing template (clic "Modifier")
  // ============================================================

  const startEdit = useCallback((t: Template) => {
    setEditingId(t.id);
    setEditingName(t.name);
    setEditingTrigger(t.trigger);
    setSubj(t.subject);
    setBody(t.body);
    setMode('visuel');
    setSubview('generer');
  }, []);

  const newTemplate = useCallback(() => {
    setEditingId(null);
    setEditingName('Nouveau modèle');
    setEditingTrigger('Envoi manuel · —');
    setSubj('Objet de l\'email');
    setBody('Bonjour {{Prénom}},\n\nVotre message ici…');
    setMode('visuel');
    setSubview('generer');
  }, []);

  const detectedVars = useMemo(() => {
    const found = htmlArea.match(/\{\{[^}]+\}\}/g) ?? [];
    return [...new Set(found)];
  }, [htmlArea]);

  const iframeSrcDoc = useMemo(() => {
    if (!htmlArea.trim()) return '';
    let preview = htmlArea;
    Object.keys(SAMPLE).forEach((v) => {
      preview = preview.split(v).join(SAMPLE[v]);
    });
    return preview;
  }, [htmlArea]);

  const subjHtml = fill(subj, previewMode);
  const bodyHtml = fill(body, previewMode);

  const footerHtml = useMemo(
    () =>
      `<div class="ef"><div class="ef-top"><b>${escapeHtml(
        footer.companyName
      )}</b><span>${escapeHtml(footer.tagline)}</span></div>` +
      `<div class="ef-co"><span>${escapeHtml(footer.addressLine)}</span>` +
      `<span>${escapeHtml(footer.email)} · ${escapeHtml(footer.phone)}</span></div>` +
      `<p class="ef-legal">${escapeHtml(footer.legal)}</p></div>`,
    [footer]
  );

  // ============================================================
  // Defense-in-depth (audit Kyle fix #3) :
  // Les HTML ci-dessus sont déjà safe (escapeHtml sur tout input dynamique),
  // mais on applique sanitizeHtml() en plus pour empêcher toute régression
  // future (si un dev oublie escapeHtml sur un nouveau champ).
  // ============================================================
  const safeSubjHtml = useMemo(() => sanitizeHtml(subjHtml), [subjHtml]);
  const safeBodyHtml = useMemo(() => sanitizeHtml(bodyHtml + footerHtml), [bodyHtml, footerHtml]);
  const safeFooterHtml = useMemo(() => sanitizeHtml(footerHtml), [footerHtml]);

  function insertVar(v: string) {
    setBody((prev) => prev + v);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const base = file.name.replace(/\.(html?|htm)$/i, '').replace(/[-_]/g, ' ');
    if (!importName) {
      setImportName(base.charAt(0).toUpperCase() + base.slice(1));
    }
    const reader = new FileReader();
    reader.onload = (e) => setHtmlArea(String(e.target?.result ?? ''));
    reader.readAsText(file);
  }

  return (
    <div>
      <div className="submenus">
        <div
          className={`submenu ${subview === 'generer' ? 'active' : ''}`}
          onClick={() => setSubview('generer')}
        >
          Générer un nouveau modèle
        </div>
        <div
          className={`submenu ${subview === 'liste' ? 'active' : ''}`}
          onClick={() => setSubview('liste')}
        >
          Modèles disponibles
        </div>
      </div>

      {/* GÉNÉRER */}
      {subview === 'generer' && (
        <div className="subview active">
          <div className="info-band">
            <div className="imark">i</div>
            <div>
              Créez un modèle une fois avec des <b>variables</b> comme <code>{'{{Prénom}}'}</code>. À chaque
              envoi, l&apos;agent les remplace par les données réelles du client. Vous pouvez aussi importer un
              fichier HTML existant.
            </div>
          </div>
          <div className="mode-switch">
            <button
              className={`mode-btn ${mode === 'visuel' ? 'active' : ''}`}
              onClick={() => setMode('visuel')}
            >
              Éditeur visuel
            </button>
            <button
              className={`mode-btn ${mode === 'import' ? 'active' : ''}`}
              onClick={() => setMode('import')}
            >
              Importer un fichier HTML
            </button>
          </div>

          {mode === 'visuel' ? (
            <div className="editor-grid">
              <div>
                <div className="sub-panel">
                  <h4>Paramètres du modèle</h4>
                  <div className="frow">
                    <div className="fg">
                      <label>Nom du modèle</label>
                      <input defaultValue="Confirmation de candidature" />
                    </div>
                    <div className="fg">
                      <label>Déclencheur</label>
                      <select>
                        <option>Candidature reçue</option>
                        <option>Mission validée</option>
                        <option>J+3 sans réponse</option>
                        <option>Envoi manuel</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label>Agent assigné</label>
                      <select>
                        <option>Agent Accueil</option>
                        <option>Agent Mission</option>
                        <option>Agent Relance</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label>Langues générées</label>
                      <select>
                        <option>Les 6 langues du site</option>
                        <option>Français uniquement</option>
                      </select>
                    </div>
                    <div className="fg full">
                      <label>Objet de l&apos;email</label>
                      <input value={subj} onChange={(e) => setSubj(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="sub-panel">
                  <h4>Corps du message</h4>
                  <div className="body-editor">
                    <CodeMirror
                      value={body}
                      onChange={setBody}
                      extensions={[htmlLang()]}
                      height="320px"
                      theme="dark"
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        autocompletion: true,
                      }}
                    />
                  </div>
                </div>
                <div className="sub-panel">
                  <h4>Insérer une variable</h4>
                  <p className="var-hint">
                    Cliquez pour insérer dans le corps. L&apos;agent remplacera par la donnée réelle à l&apos;envoi.
                  </p>
                  <div className="var-chips">
                    {VARS.map((v) => (
                      <span key={v} className="chip" onClick={() => insertVar(v)}>
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={saveTemplate} disabled={savingTpl}>
                  {savingTpl ? 'Enregistrement…' : (editingId ? 'Mettre à jour le modèle' : 'Enregistrer le modèle')}
                </button>
                {saveTplState === 'ok' && (
                  <span style={{ color: '#3F8F5B', fontSize: 12, marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="check" size={13} color="#3F8F5B" /> Modèle enregistré. Les agents utilisent désormais cette version.
                  </span>
                )}
                {saveTplState === 'error' && (
                  <span style={{ color: '#B33A3A', fontSize: 12, marginLeft: 10 }}>
                    Erreur : {tplError}
                  </span>
                )}
              </div>
              <div className="preview">
                <div className="pv-head">
                  <div className="pv-head-row">
                    <div>
                      <div className="pv-from">De : recrutement@domipack.fr</div>
                      <div className="pv-subj" dangerouslySetInnerHTML={{ __html: safeSubjHtml }} />
                    </div>
                    <button
                      className="pv-eye"
                      title="Aperçu plein écran"
                      onClick={() => setFullVisuel(true)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  className="pv-body"
                  dangerouslySetInnerHTML={{ __html: safeBodyHtml }}
                />
                <div className="pv-toggle">
                  <span>Aperçu :</span>
                  <span
                    className={`pv-lang ${previewMode === 'data' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('data')}
                  >
                    Données réelles
                  </span>
                  <span
                    className={`pv-lang ${previewMode === 'raw' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('raw')}
                  >
                    Variables
                  </span>
                  <button
                    className="pv-footer-edit"
                    onClick={() => setFooterOpen(true)}
                    title="Modifier le pied de page"
                  >
                    <Icon name="edit" size={14} /> Pied de page
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="import-grid">
              <div>
                <div className="sub-panel">
                  <h4>Importer un modèle HTML</h4>
                  <label className="dropzone">
                    <svg className="dz-ico" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="M17 8l-5-5-5 5" />
                      <path d="M12 3v12" />
                    </svg>
                    <div className="dz-title">Déposez votre fichier .html ici</div>
                    <div className="dz-sub">ou cliquez pour parcourir</div>
                    <div className="dz-file">{fileName}</div>
                    <input
                      type="file"
                      accept=".html,.htm,text/html"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                  </label>
                  <div className="or-line">
                    <span>ou collez le code HTML</span>
                  </div>
                  <div className="html-area">
                    <CodeMirror
                      value={htmlArea}
                      onChange={setHtmlArea}
                      extensions={[htmlLang()]}
                      height="200px"
                      theme="dark"
                      placeholder="<html><body>Bonjour {{Prénom}}…</body></html>"
                    />
                  </div>
                  {detectedVars.length > 0 && (
                    <div className="detected">
                      <h4>Variables détectées</h4>
                      <p className="dh">Trouvées dans le HTML. L&apos;agent les remplacera à chaque envoi.</p>
                      <div className="var-chips">
                        {detectedVars.map((v) => (
                          <span key={v} className="chip">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="frow">
                  <div className="fg">
                    <label>Nom du modèle importé</label>
                    <input
                      placeholder="Ex : Confirmation de demande"
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label>Agent assigné</label>
                    <select>
                      <option>Agent Accueil</option>
                      <option>Agent Mission</option>
                      <option>Agent Relance</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => setSubview('liste')}>
                  Importer comme modèle
                </button>
              </div>
              <div className="iframe-wrap">
                <div className="ifh">
                  <span>Aperçu du rendu</span>
                  <button
                    className="pv-eye"
                    title="Aperçu plein écran"
                    onClick={() => setFullIframe(true)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
                {iframeSrcDoc ? (
                  <iframe title="Aperçu" srcDoc={iframeSrcDoc} />
                ) : (
                  <div className="iframe-empty">Importez ou collez du HTML pour voir l&apos;aperçu.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LISTE */}
      {subview === 'liste' && (
        <div className="subview active">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13, color: '#5E6B62' }}>
              {tplLoading
                ? 'Chargement des modèles…'
                : `${templates.length} modèle${templates.length > 1 ? 's' : ''} · utilisés automatiquement par les agents à chaque envoi`}
            </div>
            <button className="btn btn-primary" onClick={newTemplate}>
              + Nouveau modèle
            </button>
          </div>
          {tplError && (
            <div style={{ color: '#B33A3A', fontSize: 12, marginBottom: 12 }}>
              Erreur : {tplError}{' '}
              <button className="btn btn-ghost" onClick={loadAll} style={{ marginLeft: 8 }}>
                Réessayer
              </button>
            </div>
          )}
          <div className="tpl-grid">
            {templates.map((t) => (
              <div key={t.id} className="tpl-card">
                <div className="tpl-top">
                  <div>
                    <div className="tpl-name">{t.name}</div>
                    <div className="tpl-trigger">{t.trigger}</div>
                  </div>
                  <span className={`badge ${t.badge}`}>{t.label}</span>
                </div>
                <div className="tpl-lang-row">
                  {LANG_TAGS.slice(0, t.langs).map((lg) => (
                    <span key={lg} className="lang-tag">
                      {lg}
                    </span>
                  ))}
                </div>
                <div className="tpl-excerpt">{t.excerpt}</div>
                <div className="tpl-meta">
                  <div className="tpl-vars">
                    {(t.vars ?? []).map((v) => (
                      <span key={v} className="tpl-var">
                        {v}
                      </span>
                    ))}
                  </div>
                  <div className="tpl-actions">
                    <button
                      className="tpl-edit"
                      onClick={() => startEdit(t)}
                    >
                      Modifier
                    </button>
                    <button
                      className="tpl-del"
                      title="Supprimer ce modèle"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le modèle ?"
        subtitle={deleteTarget?.name}
        width={460}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Annuler
            </button>
            <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: '#5E6B62', lineHeight: 1.6 }}>
          Cette action est <b>irréversible</b>. Le modèle ne sera plus utilisé par les agents pour les
          envois. Les emails déjà envoyés ne sont pas affectés.
        </p>
      </Modal>

      {/* Modal Pied de page */}
      <Modal
        open={footerOpen}
        onClose={() => setFooterOpen(false)}
        title="Pied de page des emails"
        subtitle="Ajouté automatiquement à chaque modèle. Fond bleu-deep, tous les champs modifiables."
        width={580}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setFooterOpen(false)} disabled={footerSaving}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={saveFooter}
              disabled={footerSaving}
            >
              {footerSaving ? 'Enregistrement…' : 'Enregistrer le pied de page'}
            </button>
          </>
        }
      >
        <div className="modal-field">
          <label htmlFor="ft-name">Nom de la société</label>
          <input
            id="ft-name"
            value={footer.companyName}
            onChange={(e) => setFooter({ ...footer, companyName: e.target.value })}
          />
        </div>
        <div className="modal-field" style={{ marginTop: 14 }}>
          <label htmlFor="ft-tag">Slogan</label>
          <input
            id="ft-tag"
            value={footer.tagline}
            onChange={(e) => setFooter({ ...footer, tagline: e.target.value })}
          />
        </div>
        <div className="modal-field" style={{ marginTop: 14 }}>
          <label htmlFor="ft-addr">Adresse</label>
          <input
            id="ft-addr"
            value={footer.addressLine}
            onChange={(e) => setFooter({ ...footer, addressLine: e.target.value })}
          />
        </div>
        <div className="modal-row-2" style={{ marginTop: 14 }}>
          <div className="modal-field">
            <label htmlFor="ft-email">E-mail</label>
            <input
              id="ft-email"
              type="email"
              value={footer.email}
              onChange={(e) => setFooter({ ...footer, email: e.target.value })}
            />
          </div>
          <div className="modal-field">
            <label htmlFor="ft-phone">Téléphone</label>
            <input
              id="ft-phone"
              value={footer.phone}
              onChange={(e) => setFooter({ ...footer, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-field" style={{ marginTop: 14 }}>
          <label htmlFor="ft-legal">Mention légale / désinscription</label>
          <textarea
            id="ft-legal"
            rows={3}
            value={footer.legal}
            onChange={(e) => setFooter({ ...footer, legal: e.target.value })}
          />
        </div>
        <div className="ef-preview" dangerouslySetInnerHTML={{ __html: safeFooterHtml }} />
      </Modal>

      {/* Plein écran — visuel */}
      {fullVisuel && (
        <div className="pv-fullscreen" role="dialog" aria-modal="true">
          <div className="pv-fs-bar">
            <b>Aperçu plein écran · Éditeur visuel</b>
            <button className="pv-fs-close" onClick={() => setFullVisuel(false)} title="Fermer (Échap)">
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="pv-fs-scroll">
            <div className="pv-fs-card">
              <div className="pv-from">De : recrutement@domipack.fr</div>
              <div className="pv-subj" dangerouslySetInnerHTML={{ __html: safeSubjHtml }} />
              <div
                className="pv-body"
                style={{ padding: 0 }}
                dangerouslySetInnerHTML={{ __html: safeBodyHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Plein écran — iframe import */}
      {fullIframe && (
        <div className="pv-fullscreen" role="dialog" aria-modal="true">
          <div className="pv-fs-bar">
            <b>Aperçu plein écran · Import HTML</b>
            <button className="pv-fs-close" onClick={() => setFullIframe(false)} title="Fermer (Échap)">
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="pv-fs-iframe">
            {iframeSrcDoc ? (
              <iframe title="Aperçu plein écran" srcDoc={iframeSrcDoc} />
            ) : (
              <div className="iframe-empty">Aucun contenu HTML à afficher.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
