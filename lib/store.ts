import { create } from 'zustand';

export type AdminView =
  | 'dashboard'
  | 'candidats'
  | 'emballeurs'
  | 'missions'
  | 'remuneration'
  | 'emails'
  | 'cms'
  | 'seo'
  | 'agents'
  | 'pipeline'
  | 'configuration'
  | 'profil'
  | 'parametres'
  | 'testimonials';

export const VIEW_CONFIG: Record<AdminView, { title: string; sub: string; icon: string }> = {
  dashboard: { title: 'Vue d\'ensemble', sub: 'Activité de votre recrutement en temps réel', icon: 'dashboard' },
  candidats: { title: 'Candidats & emballeurs', sub: 'Gérez et validez vos candidats', icon: 'contacts' },
  emballeurs: { title: 'Emballeurs', sub: 'Validez et attribuez des missions', icon: 'contacts' },
  missions: { title: 'Missions', sub: 'Toutes les missions d\'emballage', icon: 'dossiers' },
  remuneration: { title: 'Rémunération', sub: 'Pilotez les taux affichés sur le simulateur de salaire', icon: 'taux' },
  emails: { title: 'Modèles d\'emails', sub: 'Les emails utilisés par vos agents', icon: 'emails' },
  cms: { title: 'Contenu du site (CMS)', sub: 'Modifiez le site public depuis le CRM', icon: 'cms' },
  seo: { title: 'SEO', sub: 'Audit et référencement du site', icon: 'seo' },
  agents: { title: 'Agents IA', sub: 'Créez et configurez vos agents', icon: 'agents' },
  pipeline: { title: 'Pipeline d\'emails', sub: 'File d\'attente, envois récents et pause d\'urgence', icon: 'pipeline' },
  configuration: { title: 'Configuration', sub: 'Modèle d\'IA, passerelles, cadence et sécurité', icon: 'settings' },
  profil: { title: 'Mon profil', sub: 'Vos informations personnelles', icon: 'user' },
  parametres: { title: 'Paramètres du compte', sub: 'Comptes admin, notifications et préférences', icon: 'settings' },
  testimonials: { title: 'Témoignages', sub: 'Gérez les avis affichés sur le site', icon: 'star' },
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: 'info' | 'success' | 'alert';
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Nouvelle candidature', body: 'Marie Lefèvre a soumis sa candidature (Lyon).', time: 'Il y a 5 min', read: false, kind: 'info' },
  { id: 'n2', title: 'Mission prête', body: 'La mission « Emballage textile » est prête à collecter.', time: 'Il y a 1 h', read: false, kind: 'success' },
  { id: 'n3', title: 'Relance requise', body: 'Lucas Roy — 3 relances sans réponse.', time: 'Il y a 3 h', read: false, kind: 'alert' },
];

interface AdminState {
  currentView: AdminView;
  setCurrentView: (view: AdminView) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  notifications: INITIAL_NOTIFICATIONS,
  unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.read).length,
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: s.notifications.filter((n) => !n.read && n.id !== id).length,
    })),
  soundEnabled: true,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
}));