import type { ReactElement, ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Section heading shown above the content. */
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: 'div' | 'section' | 'article';
  padded?: boolean;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  as: Tag = 'section',
  padded = true,
}: CardProps): ReactElement {
  return (
    <Tag className={`glass rounded-3xl ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold tracking-wide text-ink-soft uppercase">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  accent = 'brand',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: 'brand' | 'cyan' | 'mint' | 'amber' | 'rose' | 'accent';
}): ReactElement {
  const ring: Record<string, string> = {
    brand: 'text-brand-soft',
    cyan: 'text-cyan',
    mint: 'text-mint',
    amber: 'text-amber',
    rose: 'text-rose',
    accent: 'text-accent',
  };
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {icon && <span className={ring[accent]}>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className="num mt-2 text-2xl font-bold text-ink sm:text-[1.75rem]">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
