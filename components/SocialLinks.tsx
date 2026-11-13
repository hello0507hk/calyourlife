import { SOCIAL_LINKS } from '@/lib/social';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13.5 22v-7.5H16l.5-3h-3V9.8c0-.9.3-1.5 1.6-1.5H16.5V5.6C16.1 5.5 15 5.4 13.8 5.4 11.2 5.4 9.5 6.9 9.5 9.5V11.5H7v3h2.5V22h4z" />
    </svg>
  );
}

const ICONS: Record<string, typeof FacebookIcon> = {
  facebook: FacebookIcon,
};

export default function SocialLinks({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const links = SOCIAL_LINKS.filter((l) => l.href);
  if (!links.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((link) => {
        const Icon = ICONS[link.id] || FacebookIcon;
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className={
              compact
                ? 'inline-flex size-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-300'
                : 'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 text-sm text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-200'
            }
          >
            <Icon className={compact ? 'size-4' : 'size-4.5'} />
            {!compact && <span>{link.label}</span>}
          </a>
        );
      })}
    </div>
  );
}
