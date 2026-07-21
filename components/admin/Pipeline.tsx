'use client';

/**
 * Pipeline de prospection CRM — 7 statuts ordonnés avec couleurs.
 * Conforme à la décision `crm_prospect_status_pipeline`.
 *
 * Chaque statut est :
 *   - affiché avec sa couleur dédiée
 *   - cliquable pour filtrer la liste des prospects
 *   - "Tous" réinitialise le filtre
 *
 * Couleurs (décision) :
 *   Nouveau        — orange
 *   Contacté       — bleu clair
 *   En cours       — bleu foncé
 *   Offre envoyée  — violet
 *   En attente     — ambre
 *   Client         — vert
 *   Perdu          — rouge
 */

export type PipelineStatus =
  | 'nouveau'
  | 'contacte'
  | 'encours'
  | 'offre'
  | 'attente'
  | 'client'
  | 'perdu';

export const PIPELINE_STATUSES: {
  id: PipelineStatus;
  label: string;
  cls: string;
}[] = [
  { id: 'nouveau', label: 'Nouveau', cls: 'st-nouveau' },
  { id: 'contacte', label: 'Contacté', cls: 'st-contacte' },
  { id: 'encours', label: 'En cours', cls: 'st-encours' },
  { id: 'offre', label: 'Offre envoyée', cls: 'st-offre' },
  { id: 'attente', label: 'En attente', cls: 'st-attente' },
  { id: 'client', label: 'Client', cls: 'st-client' },
  { id: 'perdu', label: 'Perdu', cls: 'st-perdu' },
];

export const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  encours: 'En cours',
  offre: 'Offre envoyée',
  attente: 'En attente',
  client: 'Client',
  perdu: 'Perdu',
};

export const PIPELINE_BADGE_CLS: Record<PipelineStatus, string> = {
  nouveau: 'st-nouveau',
  contacte: 'st-contacte',
  encours: 'st-encours',
  offre: 'st-offre',
  attente: 'st-attente',
  client: 'st-client',
  perdu: 'st-perdu',
};

type Props = {
  counts: Record<PipelineStatus, number>;
  total: number;
  active: PipelineStatus | 'tous';
  onSelect: (s: PipelineStatus | 'tous') => void;
};

export function Pipeline({ counts, total, active, onSelect }: Props) {
  const visibleCount =
    active === 'tous' ? total : counts[active as PipelineStatus];

  return (
    <div className="pipeline-board">
      <div className="pipeline-cols">
        {PIPELINE_STATUSES.map((s) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              className={`pipeline-col ${s.cls} ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(isActive ? 'tous' : s.id)}
              type="button"
            >
              <span className="pipeline-dot" />
              <span className="pipeline-label">{s.label}</span>
              <span className="pipeline-count">{counts[s.id] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="pipeline-foot">
        <button
          className={`pipeline-all ${active === 'tous' ? 'active' : ''}`}
          onClick={() => onSelect('tous')}
          type="button"
        >
          Tous les prospects
        </button>
        <span className="pipeline-visible">
          {visibleCount} affiché{visibleCount > 1 ? 's' : ''} sur {total}
        </span>
      </div>
    </div>
  );
}
