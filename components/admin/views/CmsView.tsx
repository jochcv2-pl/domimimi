'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const LANGS = ['Français', 'English', 'Deutsch', 'Español', 'Português', 'Italiano'];

function MiniToggle({ on, onChange }: { on: boolean; onChange?: (next: boolean) => void }) {
  const [state, setState] = useState(on);
  useEffect(() => setState(on), [on]);
  return (
    <div
      className={`mini-toggle ${state ? '' : 'off'}`}
      onClick={() => {
        const next = !state;
        setState(next);
        onChange?.(next);
      }}
      role="switch"
      aria-checked={state}
    >
      <div className="mini-knob" />
    </div>
  );
}

/**
 * Bouton "Enregistrer" avec feedback visuel.
 * Doit être défini HORS du composant parent pour ne pas reset son état
 * à chaque render (cf. react-hooks/static-components).
 */
function SaveButton({
  group,
  onSave,
  savingGroup,
  savedGroups,
  loadError,
}: {
  group: string;
  onSave: () => void;
  savingGroup: string | null;
  savedGroups: Record<string, 'ok' | 'error'>;
  loadError: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <button
        className="btn btn-primary"
        onClick={onSave}
        disabled={savingGroup === group}
      >
        {savingGroup === group ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {savedGroups[group] === 'ok' && (
        <span style={{ color: '#3F8F5B', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={13} color="#3F8F5B" /> Enregistré</span>
      )}
      {savedGroups[group] === 'error' && (
        <span style={{ color: '#B33A3A', fontSize: 12 }}>Erreur : {loadError}</span>
      )}
    </div>
  );
}

export function CmsView() {
  // Identité de marque
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  // Boutons de contact (WhatsApp/Messenger)
  const [whatsapp, setWhatsapp] = useState('');
  const [messenger, setMessenger] = useState('');
  // Hero
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCtaPrimary, setHeroCtaPrimary] = useState('');
  const [heroCtaSecondary, setHeroCtaSecondary] = useState('');
  // Avantages
  const [benefits, setBenefits] = useState<string[]>(['', '', '', '']);
  // Coordonnées
  const [phone, setPhone] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');
  const [email, setEmail] = useState('');
  const [siret, setSiret] = useState('');
  // Langues
  const [langsActive, setLangsActive] = useState<string[]>([...LANGS]);
  // Footer
  const [footTagline, setFootTagline] = useState('');
  const [footCol1Title, setFootCol1Title] = useState('');
  const [footCol1L1, setFootCol1L1] = useState('');
  const [footCol1L2, setFootCol1L2] = useState('');
  const [footCol1L3, setFootCol1L3] = useState('');
  const [footCol2Title, setFootCol2Title] = useState('');
  const [footCol2L1, setFootCol2L1] = useState('');
  const [footCol2L2, setFootCol2L2] = useState('');
  const [footCol2L3, setFootCol2L3] = useState('');
  const [footCol3Title, setFootCol3Title] = useState('');
  const [footCol3L1, setFootCol3L1] = useState('');
  const [footCol3L2, setFootCol3L2] = useState('');
  const [footCol3L3, setFootCol3L3] = useState('');
  // Email header
  const [ehBrand, setEhBrand] = useState('');
  const [ehColor, setEhColor] = useState('#0F2019');
  const [ehTagline, setEhTagline] = useState('');
  // Email footer
  const [efCompany, setEfCompany] = useState('');
  const [efTagline, setEfTagline] = useState('');
  const [efAddress, setEfAddress] = useState('');
  const [efEmail, setEfEmail] = useState('');
  const [efPhone, setEfPhone] = useState('');
  const [efWebsite, setEfWebsite] = useState('');
  const [efLegal, setEfLegal] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [savedGroups, setSavedGroups] = useState<Record<string, 'ok' | 'error'>>({});

  // ============================================================
  // Fetch
  // ============================================================

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const map: Record<string, string> = json?.data ?? {};
      setBrandName(map['cms.brand_name'] ?? 'domipackung');
      setLogoUrl(map['cms.logo_url'] ?? '');
      setWhatsapp(map['contact.whatsapp'] ?? '');
      setMessenger(map['contact.messenger'] ?? '');
      setHeroTitle(map['cms.hero.title'] ?? '');
      setHeroSubtitle(map['cms.hero.subtitle'] ?? '');
      setHeroCtaPrimary(map['cms.hero.cta_primary'] ?? '');
      setHeroCtaSecondary(map['cms.hero.cta_secondary'] ?? '');
      try {
        const b = JSON.parse(map['cms.benefits'] ?? '[]');
        if (Array.isArray(b) && b.length >= 4) {
          setBenefits(b);
        } else {
          setBenefits(['Horaires libres', 'Zéro avance de frais', 'Payé chaque mois', 'Sans expérience']);
        }
      } catch { /* garde default */ }
      setPhone(map['cms.contact.phone'] ?? '');
      setWhatsappDisplay(map['cms.contact.whatsapp_display'] ?? '');
      setEmail(map['cms.contact.email'] ?? '');
      setSiret(map['cms.company.siret'] ?? '');
      try {
        const l = JSON.parse(map['cms.langs_active'] ?? '[]');
        if (Array.isArray(l) && l.length > 0) setLangsActive(l);
      } catch { /* garde default */ }
      // Footer
      setFootTagline(map['footer.tagline'] ?? '');
      setFootCol1Title(map['footer.col1.title'] ?? '');
      setFootCol1L1(map['footer.col1.link1'] ?? '');
      setFootCol1L2(map['footer.col1.link2'] ?? '');
      setFootCol1L3(map['footer.col1.link3'] ?? '');
      setFootCol2Title(map['footer.col2.title'] ?? '');
      setFootCol2L1(map['footer.col2.link1'] ?? '');
      setFootCol2L2(map['footer.col2.link2'] ?? '');
      setFootCol2L3(map['footer.col2.link3'] ?? '');
      setFootCol3Title(map['footer.col3.title'] ?? '');
      setFootCol3L1(map['footer.col3.link1'] ?? '');
      setFootCol3L2(map['footer.col3.link2'] ?? '');
      setFootCol3L3(map['footer.col3.link3'] ?? '');
      // Email header
      setEhBrand(map['email.header.brand'] ?? '');
      setEhColor(map['email.header.bg_color'] ?? '#0F2019');
      setEhTagline(map['email.header.tagline'] ?? '');
      // Email footer
      setEfCompany(map['email.footer.company_name'] ?? '');
      setEfTagline(map['email.footer.tagline'] ?? '');
      setEfAddress(map['email.footer.address'] ?? '');
      setEfEmail(map['email.footer.email'] ?? '');
      setEfPhone(map['email.footer.phone'] ?? '');
      setEfWebsite(map['email.footer.website'] ?? '');
      setEfLegal(map['email.footer.legal'] ?? '');
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
  // Save groupe
  // ============================================================

  const saveGroup = useCallback(async (
    group: string,
    settings: { key: string; value: string }[]
  ) => {
    setSavingGroup(group);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedGroups((prev) => ({ ...prev, [group]: 'ok' }));
      setTimeout(() => setSavedGroups((prev) => {
        const n = { ...prev };
        delete n[group];
        return n;
      }), 2500);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur');
      setSavedGroups((prev) => ({ ...prev, [group]: 'error' }));
    } finally {
      setSavingGroup(null);
    }
  }, []);

  // ============================================================
  // Upload logo
  // ============================================================

  const handleLogoUpload = useCallback(async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setLogoUrl(json.logoUrl ?? '');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur upload logo');
    } finally {
      setLogoUploading(false);
    }
  }, []);

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return <div style={{ padding: 24, color: '#5E6B62' }}>Chargement du CMS…</div>;
  }

  const toggleLang = (lg: string, on: boolean) => {
    setLangsActive((prev) => {
      const set = new Set(prev);
      if (on) set.add(lg); else set.delete(lg);
      return [...set];
    });
  };

  return (
    <div>
      <div className="info-band">
        <div className="imark">i</div>
        <div>
          Modifiez tout le contenu du site public depuis ici. Les changements s&apos;appliquent directement aux
          pages en ligne, dans les 6 langues.
        </div>
      </div>
      {loadError && (
        <div style={{ color: '#B33A3A', fontSize: 12, marginBottom: 12 }}>
          {loadError} <button className="btn btn-ghost" onClick={load}>Réessayer</button>
        </div>
      )}

      {/* ============================================================ */}
      {/* IDENTITÉ DE MARQUE                                            */}
      {/* ============================================================ */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h3>Identité de marque</h3>
        </div>
        <div className="panel-body" style={{ paddingTop: 16 }}>
          <div className="fg" style={{ marginBottom: 16 }}>
            <label>Nom de la marque</label>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="domipackung"
            />
            <p className="field-hint">
              Affiché dans la navbar, le footer, le titre de l&apos;onglet et les emails.
            </p>
          </div>
          <div className="fg" style={{ marginBottom: 12 }}>
            <label>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo actuel"
                  style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 6, padding: 4 }}
                />
              ) : (
                <div style={{ height: 48, width: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', borderRadius: 6, color: '#999', fontSize: 12 }}>
                  Pas de logo — SVG par défaut
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="btn btn-ghost" style={{ cursor: 'pointer', fontSize: 13 }}>
                  {logoUploading ? 'Upload…' : 'Changer le logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    style={{ display: 'none' }}
                    disabled={logoUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {logoUrl && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 13, color: '#B33A3A' }}
                    onClick={() => setLogoUrl('')}
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
            <p className="field-hint">
              PNG, JPG, SVG ou WebP · 2MB max · Affiché dans la navbar et le footer à la place du SVG par défaut.
            </p>
          </div>
          <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
            group="brand"
            onSave={() => saveGroup('brand', [
              { key: 'cms.brand_name', value: brandName.trim() || 'domipackung' },
              { key: 'cms.logo_url', value: logoUrl },
            ])}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* BOUTONS DE CONTACT                                            */}
      {/* ============================================================ */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h3>Boutons de contact (emails + landing)</h3>
        </div>
        <div className="panel-body" style={{ paddingTop: 16 }}>
          <div className="info-band" style={{ marginBottom: 14 }}>
            <div className="imark">!</div>
            <div>
              Ces URLs apparaissent dans <b>tous les emails agents</b> sous forme de boutons. Le prospect
              clique pour contacter un référent humain et finaliser son recrutement.
            </div>
          </div>
          <div className="fg" style={{ marginBottom: 12 }}>
            <label>URL WhatsApp (bouton vert)</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="https://wa.me/33600000000"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div className="fg" style={{ marginBottom: 12 }}>
            <label>URL Messenger (bouton bleu)</label>
            <input
              value={messenger}
              onChange={(e) => setMessenger(e.target.value)}
              placeholder="https://m.me/domipack"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
            group="contact"
            onSave={() => saveGroup('contact', [
              { key: 'contact.whatsapp', value: whatsapp.trim() },
              { key: 'contact.messenger', value: messenger.trim() },
            ])}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESIGN DES EMAILS (header + footer)                           */}
      {/* ============================================================ */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h3>Design des emails — En-tête &amp; Pied de page</h3>
        </div>
        <div className="panel-body" style={{ paddingTop: 16 }}>
          <div className="info-band" style={{ marginBottom: 14 }}>
            <div className="imark">!</div>
            <div>
              Ces réglages contrôlent l&apos;<b>en-tête</b> et le <b>pied de page</b> de <b>tous les emails</b> envoyés
              par le système (accueil, missions, relances, validation…). Si un champ est vide, la valeur par défaut est utilisée.
            </div>
          </div>

          {/* Sous-section HEADER */}
          <h4 style={{ fontSize: 13, color: '#0F2019', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>En-tête</h4>
          <div className="frow" style={{ marginBottom: 0 }}>
            <div className="fg">
              <label>Texte / nom de marque</label>
              <input
                value={ehBrand}
                onChange={(e) => setEhBrand(e.target.value)}
                placeholder="(utilise le nom de la marque par défaut)"
              />
            </div>
            <div className="fg">
              <label>Couleur de fond</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={ehColor}
                  onChange={(e) => setEhColor(e.target.value)}
                  style={{ width: 44, height: 38, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                />
                <input
                  value={ehColor}
                  onChange={(e) => setEhColor(e.target.value)}
                  style={{ fontFamily: 'monospace', flex: 1 }}
                  placeholder="#0F2019"
                />
              </div>
            </div>
          </div>
          <div className="fg" style={{ marginTop: 12 }}>
            <label>Slogan / sous-titre (optionnel)</label>
            <input
              value={ehTagline}
              onChange={(e) => setEhTagline(e.target.value)}
              placeholder="Ex : Heimverpackung & Logistik"
            />
            <p className="field-hint">Petit texte sous le logo, en blanc semi-transparent.</p>
          </div>
          <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
            group="email_header"
            onSave={() => saveGroup('email_header', [
              { key: 'email.header.brand', value: ehBrand.trim() },
              { key: 'email.header.bg_color', value: ehColor.trim() || '#0F2019' },
              { key: 'email.header.tagline', value: ehTagline },
            ])}
          />

          {/* Séparateur */}
          <div style={{ height: 1, background: '#E0E4DC', margin: '24px 0' }} />

          {/* Sous-section FOOTER */}
          <h4 style={{ fontSize: 13, color: '#0F2019', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pied de page</h4>
          <div className="frow" style={{ marginBottom: 12 }}>
            <div className="fg">
              <label>Nom société</label>
              <input
                value={efCompany}
                onChange={(e) => setEfCompany(e.target.value)}
                placeholder="(nom de la marque par défaut)"
              />
            </div>
            <div className="fg">
              <label>Slogan</label>
              <input
                value={efTagline}
                onChange={(e) => setEfTagline(e.target.value)}
                placeholder="Heimverpackung & Logistik"
              />
            </div>
          </div>
          <div className="frow" style={{ marginBottom: 12 }}>
            <div className="fg">
              <label>Adresse</label>
              <input
                value={efAddress}
                onChange={(e) => setEfAddress(e.target.value)}
                placeholder="Musterstraße 1, 10115 Berlin"
              />
            </div>
            <div className="fg">
              <label>Téléphone</label>
              <input
                value={efPhone}
                onChange={(e) => setEfPhone(e.target.value)}
                placeholder="+49 30 0000 0000"
              />
            </div>
          </div>
          <div className="frow" style={{ marginBottom: 12 }}>
            <div className="fg">
              <label>Email contact</label>
              <input
                value={efEmail}
                onChange={(e) => setEfEmail(e.target.value)}
                placeholder="kontakt@domipackung.de"
              />
            </div>
            <div className="fg">
              <label>Site web</label>
              <input
                value={efWebsite}
                onChange={(e) => setEfWebsite(e.target.value)}
                placeholder="https://domipackung.de"
              />
            </div>
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label>Mentions légales / disclaimer</label>
            <textarea
              value={efLegal}
              onChange={(e) => setEfLegal(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
              placeholder="Diese E-Mail wurde automatisch versendet…"
            />
            <p className="field-hint">Petit texte gris en bas du footer. DSGV/mentions par défaut si vide.</p>
          </div>
          <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
            group="email_footer"
            onSave={() => saveGroup('email_footer', [
              { key: 'email.footer.company_name', value: efCompany.trim() },
              { key: 'email.footer.tagline', value: efTagline },
              { key: 'email.footer.address', value: efAddress },
              { key: 'email.footer.email', value: efEmail.trim() },
              { key: 'email.footer.phone', value: efPhone.trim() },
              { key: 'email.footer.website', value: efWebsite.trim() },
              { key: 'email.footer.legal', value: efLegal },
            ])}
          />
        </div>
      </div>

      <div className="grid-2">
        <div>
          {/* HERO */}
          <div className="panel">
            <div className="panel-head">
              <h3>Section Hero (accueil)</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 16 }}>
              <div className="fg" style={{ marginBottom: 12 }}>
                <label>Titre principal</label>
                <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 12 }}>
                <label>Sous-titre</label>
                <input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
              </div>
              <div className="frow" style={{ marginBottom: 0 }}>
                <div className="fg">
                  <label>Bouton principal</label>
                  <input value={heroCtaPrimary} onChange={(e) => setHeroCtaPrimary(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Bouton secondaire</label>
                  <input value={heroCtaSecondary} onChange={(e) => setHeroCtaSecondary(e.target.value)} />
                </div>
              </div>
              <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
                group="hero"
                onSave={() => saveGroup('hero', [
                  { key: 'cms.hero.title', value: heroTitle },
                  { key: 'cms.hero.subtitle', value: heroSubtitle },
                  { key: 'cms.hero.cta_primary', value: heroCtaPrimary },
                  { key: 'cms.hero.cta_secondary', value: heroCtaSecondary },
                ])}
              />
            </div>
          </div>

          {/* AVANTAGES */}
          <div className="panel">
            <div className="panel-head">
              <h3>Nos avantages</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 16 }}>
              {benefits.map((b, i) => (
                <div key={i} className="fg" style={{ marginBottom: i === benefits.length - 1 ? 0 : 10 }}>
                  <label>Avantage {i + 1}</label>
                  <input
                    value={b}
                    onChange={(e) => setBenefits((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                  />
                </div>
              ))}
              <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
                group="benefits"
                onSave={() => saveGroup('benefits', [
                  { key: 'cms.benefits', value: JSON.stringify(benefits) },
                ])}
              />
            </div>
          </div>
        </div>

        <div>
          {/* COORDONNÉES */}
          <div className="panel">
            <div className="panel-head">
              <h3>Coordonnées</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 16 }}>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Téléphone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>WhatsApp (affichage public)</label>
                <input value={whatsappDisplay} onChange={(e) => setWhatsappDisplay(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Email recrutement</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>SIRET</label>
                <input value={siret} onChange={(e) => setSiret(e.target.value)} />
              </div>
              <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
                group="coords"
                onSave={() => saveGroup('coords', [
                  { key: 'cms.contact.phone', value: phone },
                  { key: 'cms.contact.whatsapp_display', value: whatsappDisplay },
                  { key: 'cms.contact.email', value: email },
                  { key: 'cms.company.siret', value: siret },
                ])}
              />
            </div>
          </div>

          {/* PIED DE PAGE (FOOTER) */}
          <div className="panel">
            <div className="panel-head">
              <h3>Pied de page (Footer)</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 16 }}>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Slogan</label>
                <input value={footTagline} onChange={(e) => setFootTagline(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Colonne 1 — Titre</label>
                <input value={footCol1Title} onChange={(e) => setFootCol1Title(e.target.value)} placeholder="Ex : {{brandName}}" />
              </div>
              <div className="fg" style={{ marginBottom: 6 }}>
                <label>Colonne 1 — Liens (3 max)</label>
                <input value={footCol1L1} onChange={(e) => setFootCol1L1(e.target.value)} placeholder="Lien 1" />
                <input value={footCol1L2} onChange={(e) => setFootCol1L2(e.target.value)} placeholder="Lien 2" style={{ marginTop: 6 }} />
                <input value={footCol1L3} onChange={(e) => setFootCol1L3(e.target.value)} placeholder="Lien 3" style={{ marginTop: 6 }} />
              </div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Colonne 2 — Titre</label>
                <input value={footCol2Title} onChange={(e) => setFootCol2Title(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 6 }}>
                <label>Colonne 2 — Liens (3 max)</label>
                <input value={footCol2L1} onChange={(e) => setFootCol2L1(e.target.value)} placeholder="Lien 1" />
                <input value={footCol2L2} onChange={(e) => setFootCol2L2(e.target.value)} placeholder="Lien 2" style={{ marginTop: 6 }} />
                <input value={footCol2L3} onChange={(e) => setFootCol2L3(e.target.value)} placeholder="Lien 3" style={{ marginTop: 6 }} />
              </div>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Colonne 3 — Titre</label>
                <input value={footCol3Title} onChange={(e) => setFootCol3Title(e.target.value)} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Colonne 3 — Liens (3 max)</label>
                <input value={footCol3L1} onChange={(e) => setFootCol3L1(e.target.value)} placeholder="Lien 1" />
                <input value={footCol3L2} onChange={(e) => setFootCol3L2(e.target.value)} placeholder="Lien 2" style={{ marginTop: 6 }} />
                <input value={footCol3L3} onChange={(e) => setFootCol3L3(e.target.value)} placeholder="Lien 3" style={{ marginTop: 6 }} />
              </div>
              <p className="field-hint" style={{ marginTop: 8 }}>
                Laissez vide pour utiliser les traductions par défaut.
              </p>
              <SaveButton
                savingGroup={savingGroup}
                savedGroups={savedGroups}
                loadError={loadError}
                group="footer"
                onSave={() => saveGroup('footer', [
                  { key: 'footer.tagline', value: footTagline },
                  { key: 'footer.col1.title', value: footCol1Title },
                  { key: 'footer.col1.link1', value: footCol1L1 },
                  { key: 'footer.col1.link2', value: footCol1L2 },
                  { key: 'footer.col1.link3', value: footCol1L3 },
                  { key: 'footer.col2.title', value: footCol2Title },
                  { key: 'footer.col2.link1', value: footCol2L1 },
                  { key: 'footer.col2.link2', value: footCol2L2 },
                  { key: 'footer.col2.link3', value: footCol2L3 },
                  { key: 'footer.col3.title', value: footCol3Title },
                  { key: 'footer.col3.link1', value: footCol3L1 },
                  { key: 'footer.col3.link2', value: footCol3L2 },
                  { key: 'footer.col3.link3', value: footCol3L3 },
                ])}
              />
            </div>
          </div>

          {/* LANGUES */}
          <div className="panel">
            <div className="panel-head">
              <h3>Langues actives</h3>
            </div>
            <div className="panel-body" style={{ paddingTop: 16 }}>
              <p className="field-hint" style={{ marginBottom: 12 }}>
                Décochez pour désactiver une version linguistique sur le site public.
              </p>
              <div className="tool-grid">
                {LANGS.map((lg) => (
                  <div key={lg} className="tool">
                    <div className="tool-name">{lg}</div>
                    <MiniToggle
                      on={langsActive.includes(lg)}
                      onChange={(next) => toggleLang(lg, next)}
                    />
                  </div>
                ))}
              </div>
              <SaveButton
            savingGroup={savingGroup}
            savedGroups={savedGroups}
            loadError={loadError}
                group="langs"
                onSave={() => saveGroup('langs', [
                  { key: 'cms.langs_active', value: JSON.stringify(langsActive) },
                ])}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
