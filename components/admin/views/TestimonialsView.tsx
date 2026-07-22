'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';

type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  photoUrl: string | null;
  locale: string;
  sort: number;
  active: boolean;
};

type FetchState = 'loading' | 'success' | 'error';

export function TestimonialsView() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setFetchState('loading');
    try {
      const res = await fetch('/api/admin/testimonials', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json?.data?.items ?? []);
      setFetchState('success');
    } catch {
      setFetchState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce témoignage ?')) return;
    await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggleActive(item: Testimonial) {
    await fetch(`/api/admin/testimonials/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    });
    load();
  }

  if (fetchState === 'loading') {
    return <div style={{ padding: 40, textAlign: 'center', color: '#95A198' }}>Chargement…</div>;
  }

  if (fetchState === 'error') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#B23A2E' }}>
        Impossible de charger les témoignages.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 13, color: '#5E6B62' }}>
          {items.length} témoignage{items.length > 1 ? 's' : ''} · {items.filter((i) => i.active).length} actif{items.filter((i) => i.active).length > 1 ? 's' : ''}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          + Nouveau témoignage
        </button>
      </div>

      {showForm && (
        <TestimonialForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      {items.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#95A198',
          background: '#fff',
          border: '1px solid #DDE1D6',
          borderRadius: 14,
        }}>
          Aucun témoignage pour le moment. Cliquez sur « Nouveau témoignage » pour en ajouter un.
          <br />
          <small>En l&apos;absence de témoignages, le site affiche les 3 témoignages par défaut.</small>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#fff',
                border: '1px solid #DDE1D6',
                borderRadius: 14,
                padding: '18px 22px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                opacity: item.active ? 1 : 0.55,
              }}
            >
              {/* Photo */}
              {item.photoUrl ? (
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#2C5344',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 15,
                  flexShrink: 0,
                }}>
                  {item.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <b style={{ fontSize: 14, color: '#23282A' }}>{item.name}</b>
                  <span style={{ fontSize: 11, color: '#95A198' }}>{item.role}</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    background: '#EDEFE7',
                    borderRadius: 5,
                    padding: '2px 7px',
                    color: '#5E6B62',
                    textTransform: 'uppercase',
                  }}>
                    {item.locale || 'toutes'}
                  </span>
                </div>
                <div style={{ color: '#E8A93C', fontSize: 12, marginBottom: 6, display: 'flex', gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Icon key={idx} name="starFilled" size={12} color="#E8A93C" strokeWidth={0} />
                  ))}
                </div>
                <p style={{ fontSize: 13, color: '#5E6B62', lineHeight: 1.6, margin: 0 }}>
                  {item.quote}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleActive(item)}
                  title={item.active ? 'Masquer' : 'Afficher'}
                >
                  {item.active ? 'Masquer' : 'Afficher'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setEditing(item); setShowForm(true); }}
                >
                  Modifier
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(item.id)}
                  style={{ color: '#B23A2E' }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Formulaire d'ajout / édition
// ============================================================

function TestimonialForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Testimonial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [locale, setLocale] = useState(initial?.locale ?? 'fr');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/testimonials/upload-photo', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      setPhotoUrl(json?.data?.photoUrl ?? '');
    } catch {
      alert("Erreur lors de l'upload de la photo.");
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!name.trim() || !quote.trim()) {
      alert('Le nom et le témoignage sont requis.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        quote: quote.trim(),
        rating,
        locale,
        photoUrl: photoUrl || null,
      };

      if (initial) {
        await fetch(`/api/admin/testimonials/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/admin/testimonials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setSaveOk(true);
      setTimeout(onSaved, 800);
    } catch {
      alert("Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #DDE1D6',
      borderRadius: 14,
      padding: 24,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>
          {initial ? 'Modifier le témoignage' : 'Nouveau témoignage'}
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
      </div>

      <div className="frow">
        <div className="fg">
          <label>Nom complet *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sophie L." />
        </div>
        <div className="fg">
          <label>Rôle / Statut</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Parent au foyer · Nantes" />
        </div>
      </div>

      <div className="fg full" style={{ marginBottom: 14 }}>
        <label>Témoignage *</label>
        <textarea
          className="body-editor"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Le texte du témoignage…"
          rows={4}
          style={{ minHeight: 100 }}
        />
      </div>

      <div className="frow" style={{ marginBottom: 14 }}>
        <div className="fg">
          <label>Note</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            <option value={5}>5 étoiles</option>
            <option value={4}>4 étoiles</option>
            <option value={3}>3 étoiles</option>
          </select>
        </div>
        <div className="fg">
          <label>Langue</label>
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="fr">Français</option>
            <option value="de">Allemand</option>
            <option value="">Toutes les langues</option>
          </select>
        </div>
      </div>

      {/* Upload photo */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#5E6B62', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Photo (optionnel)
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {photoUrl && (
            <img
              src={photoUrl}
              alt="Aperçu"
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <div style={{ flex: 1 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Upload en cours…' : photoUrl ? 'Changer la photo' : 'Téléverser une photo'}
            </button>
            {photoUrl && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPhotoUrl('')}
                style={{ marginLeft: 8, color: '#B23A2E' }}
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
        {saveOk && <span style={{ fontSize: 12, color: '#2E7D46', fontWeight: 600 }}>Enregistré</span>}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || uploading}
        >
          {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </div>
  );
}
