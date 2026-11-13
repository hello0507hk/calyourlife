import type { Metadata } from 'next';
import { connection } from 'next/server';
import { adminConfigured, isAdmin } from '@/lib/adminAuth';
import LoginForm from '../LoginForm';

export const metadata: Metadata = {
  title: '帳號資料管理 | 算命網後台',
  robots: { index: false, follow: false },
};

export default async function AdminAccountsLayout({ children }: { children: React.ReactNode }) {
  await connection();
  if (!(await isAdmin())) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="max-w-sm text-center text-sm text-slate-300">後台未啟用。</p>
        )}
      </main>
    );
  }
  return children;
}
