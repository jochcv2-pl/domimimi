'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Icon } from '@/components/ui/Icon';

export default function LoginClient({ brandName = 'domipackung', logoUrl }: { brandName?: string; logoUrl?: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError('Email ou mot de passe incorrect.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="login-split">
      {/* Panneau marque */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-logo">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} style={{ height: 28, width: 'auto' }} />
            ) : (
              <>
                <svg viewBox="0 0 30 24" fill="none" width="34" height="28">
                  <path d="M2 7 15 1l13 6-13 6z" fill="#C08A5A" />
                  <path d="M2 7v10l13 6V13z" fill="#0F2942" />
                  <path d="M28 7v10l-13 6V13z" fill="#1E6FB8" />
                  <path d="M9 4l13 6" stroke="#E8A93C" strokeWidth="1.6" />
                </svg>
                <span>{brandName}</span>
              </>
            )}
          </div>
          <div className="login-brand-copy">
            <h1>Espace administrateur</h1>
            <p>
              Gérez vos candidatures, missions et emballeurs depuis une interface
              centralisée et sécurisée.
            </p>
          </div>
          <div className="login-brand-foot">
            <span>Accès réservé. Authentification requise</span>
          </div>
        </div>
      </div>

      {/* Panneau formulaire */}
      <div className="login-form-side">
        <div className="login-card">
          <h2>Connexion</h2>
          <p className="login-sub">Entrez vos identifiants pour accéder au CRM.</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="admin@domipack.fr"
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <Link href="/" className="login-back" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="arrowLeft" size={16} /> Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
