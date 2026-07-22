import { Sidebar } from '@/components/admin/Sidebar';
import { Topbar } from '@/components/admin/Topbar';
import { getBrandSettings } from '@/lib/brand';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { brandName, logoUrl } = await getBrandSettings();

  return (
    <div className="admin-layout">
      <Sidebar brandName={brandName} logoUrl={logoUrl} />
      <main className="main">
        <Topbar />
        <div className="view active">{children}</div>
      </main>
    </div>
  );
}
