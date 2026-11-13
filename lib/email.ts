const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
// Until a sending domain is verified in Resend, only onboarding@resend.dev works, and only to the account owner's address.
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || '算命網 <onboarding@resend.dev>';

export const SITE_URL = (process.env.SITE_URL?.trim() || 'https://www.calyourfate.com').replace(/\/$/, '');

export const emailConfigured = () => !!RESEND_API_KEY;

export async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const FONT = `-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', sans-serif`;

/** Wraps body HTML in a simple, inline-styled layout that survives Gmail / Outlook stripping. */
export async function markdownToEmailHtml(markdown: string) {
  const { marked } = await import('marked');
  marked.setOptions({ gfm: true, breaks: false });
  const html = await marked.parse(markdown);
  return `<div class="report">${html}</div>`;
}

export async function sendReportEmail(opts: {
  to: string;
  title: string;
  markdown: string;
}) {
  const bodyHtml = await markdownToEmailHtml(opts.markdown);
  const text = opts.markdown.replace(/\s+/g, ' ').trim().slice(0, 4000);
  await sendEmail({
    to: opts.to,
    subject: `算命網報告 · ${opts.title}`,
    text: `${opts.title}\n\n${text}`,
    html: emailLayout(opts.title, bodyHtml),
  });
}

export function emailLayout(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  .report h2,.report h3{color:#92400e;margin:22px 0 8px;font-size:17px;line-height:1.4}
  .report h3{border-left:4px solid #f59e0b;background:#fffbeb;padding:6px 10px;border-radius:6px}
  .report h4{margin:16px 0 6px;font-size:15px}
  .report p,.report li{font-size:15px;line-height:1.8;color:#1e293b}
  .report ul,.report ol{padding-left:22px;margin:8px 0}
  .report strong{color:#92400e}
  .report hr{border:0;border-top:1px solid #fcd34d;margin:22px 0}
  .report table{border-collapse:collapse;width:100%;font-size:13px;margin:10px 0}
  .report th,.report td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
  .report th{background:#fffbeb}
  .report blockquote{margin:10px 0;padding:4px 12px;border-left:3px solid #38bdf8;background:#f0f9ff;color:#334155}
</style></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${FONT};color:#0f172a">
<div style="max-width:680px;margin:0 auto;padding:24px 16px">
  <div style="font-size:20px;font-weight:700;color:#b45309;margin-bottom:4px">算命網 · CalYourLife</div>
  <div style="font-size:13px;color:#64748b;margin-bottom:20px">${escapeHtml(title)}</div>
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px">${bodyHtml}</div>
  <div style="font-size:12px;color:#94a3b8;margin-top:18px;line-height:1.6">
    此電郵由 <a href="${SITE_URL}" style="color:#b45309">${SITE_URL.replace(/^https?:\/\//, '')}</a> 自動發出。命理分析僅供參考，請勿作為重大決定的唯一依據。
  </div>
</div></body></html>`;
}
