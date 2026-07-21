import { Sidebar } from '@/components/admin/Sidebar';
import { Topbar } from '@/components/admin/Topbar';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="view active">{children}</div>
      </main>
    </div>
  );
}
