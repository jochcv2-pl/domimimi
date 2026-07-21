'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Modal · composant modal réutilisable pour le CRM admin.
 * Fermeture : clic sur l'overlay, touche Échap, ou bouton de fermeture.
 * Verrouille le scroll body quand ouvert.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
