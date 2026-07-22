import { Suspense } from 'react';
import LoginClient from './LoginClient';
import { getBrandSettings } from '@/lib/brand';

export default async function LoginPage() {
  const { brandName, logoUrl } = await getBrandSettings();

  return (
    <Suspense fallback={<div className="login-loading">Chargement…</div>}>
      <LoginClient brandName={brandName} logoUrl={logoUrl} />
    </Suspense>
  );
}
