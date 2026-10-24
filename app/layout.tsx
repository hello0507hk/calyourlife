import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_TC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifTC = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  weight: ["500", "700"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: '算命網 · 星平合參八字排盤與 AI 命理分析 | CalYourLife',
  description: '子平八字四柱排盤、藏干餘氣十神、大運流年，結合七政四餘星盤與多模型 AI 會診，提供深度解盤、流年批算與問事。',
  appleWebApp: { title: '算命網', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifTC.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
