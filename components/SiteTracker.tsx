'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const VISITOR_KEY = 'cyl-visitor-id';
let visitSent = false;

function send(payload: Record<string, string>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return;
  fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
}

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function externalReferrer() {
  try {
    if (!document.referrer) return '';
    const host = new URL(document.referrer).hostname;
    return host === location.hostname ? '' : host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function trackEvent(event: 'chart') {
  try {
    send({ event });
  } catch {
    // 統計失敗不影響使用
  }
}

export default function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (visitSent || pathname.startsWith('/admin')) return;
    visitSent = true;
    try {
      send({ event: 'visit', visitorId: visitorId(), referrer: externalReferrer() });
    } catch {
      // 統計失敗不影響使用
    }
  }, [pathname]);

  return null;
}
