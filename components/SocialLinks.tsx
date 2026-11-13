import { SOCIAL_LINKS } from '@/lib/social';

/** Official-style Facebook “f” mark */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.62 23.1 24 18.1 24 12.07" />
    </svg>
  );
}

const ICONS: Record<string, typeof FacebookIcon> = {
  facebook: FacebookIcon,
};

export default function SocialLinks({
  className = '',
  size = 'md',
}: {
  className?: string;
  /** sm = header; lg = landing */
  size?: 'sm' | 'md' | 'lg';
}) {
  const links = SOCIAL_LINKS.filter((l) => l.href);
  if (!links.length) return null;

  const box = size === 'lg' ? 'size-14' : size === 'sm' ? 'size-11' : 'size-12';
  const icon = size === 'lg' ? 'size-9' : size === 'sm' ? 'size-7' : 'size-8';

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
            title={link.label}
            className={`inline-flex ${box} items-center justify-center rounded-full text-[#1877F2] transition-transform hover:scale-110 active:scale-95`}
          >
            <Icon className={icon} />
          </a>
        );
      })}
    </div>
  );
}
