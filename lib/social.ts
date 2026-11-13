/**
 * 社交平台連結。
 * 可在 Vercel Environment Variables 設 NEXT_PUBLIC_FACEBOOK_PAGE_URL 覆蓋下方預設值。
 */
const DEFAULT_FACEBOOK_PAGE_URL = 'https://www.facebook.com/profile.php?id=61596339697765';

export const FACEBOOK_PAGE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FACEBOOK_PAGE_URL?.trim()) ||
  DEFAULT_FACEBOOK_PAGE_URL;

export const SOCIAL_LINKS = [
  {
    id: 'facebook',
    label: '面書專頁',
    href: FACEBOOK_PAGE_URL,
  },
] as const;
