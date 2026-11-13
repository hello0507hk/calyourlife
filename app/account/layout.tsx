import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '我的命盤 | 算命網',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
