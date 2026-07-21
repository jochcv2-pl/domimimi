'use client';

import { useAdminStore, AdminView } from '@/lib/store';
import {
  DashboardView,
  CandidatsView,
  MissionsView,
  RemunerationView,
  EmailsView,
  CmsView,
  SeoView,
  AgentsView,
  PipelineView,
  ConfigurationView,
  ProfilView,
  ParametresView,
} from '@/components/admin/views';

const VIEWS: Record<AdminView, React.ComponentType> = {
  dashboard: DashboardView,
  candidats: CandidatsView,
  missions: MissionsView,
  remuneration: RemunerationView,
  emails: EmailsView,
  cms: CmsView,
  seo: SeoView,
  agents: AgentsView,
  pipeline: PipelineView,
  configuration: ConfigurationView,
  profil: ProfilView,
  parametres: ParametresView,
};

export default function AdminPage() {
  const currentView = useAdminStore((s) => s.currentView);
  const View = VIEWS[currentView] ?? DashboardView;
  return <View />;
}
