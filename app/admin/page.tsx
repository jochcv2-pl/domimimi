'use client';

import { useAdminStore, AdminView } from '@/lib/store';
import {
  DashboardView,
  CandidatsView,
  EmballeursView,
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
  TestimonialsView,
} from '@/components/admin/views';

const VIEWS: Record<AdminView, React.ComponentType> = {
  dashboard: DashboardView,
  candidats: CandidatsView,
  emballeurs: EmballeursView,
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
  testimonials: TestimonialsView,
};

export default function AdminPage() {
  const currentView = useAdminStore((s) => s.currentView);
  const View = VIEWS[currentView] ?? DashboardView;
  return <View />;
}
