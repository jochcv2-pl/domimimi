'use client';

import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * ContactForm · formulaire de contact public.
 * Composant client (état + fetch).
 */
export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Une erreur est survenue. Réessayez.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setError('Connexion impossible. Réessayez dans un instant.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="form-success">
        <p>
          ? Merci ! Votre message a bien été envoyé. Nous vous répondrons sous 48 h.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStatus('idle')}
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="contact-name">Nom complet</label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={status === 'submitting'}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-email">Adresse e-mail</label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'submitting'}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-subject">Sujet</label>
        <input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          disabled={status === 'submitting'}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message">Votre message</label>
        <textarea
          id="contact-message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          disabled={status === 'submitting'}
        />
      </div>
      {status === 'error' && error && (
        <p className="form-error">{error}</p>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Envoi en cours…' : 'Envoyer le message'}
      </button>
    </form>
  );
}
