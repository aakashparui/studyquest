import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { sound } from '../../lib/sound';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Suppress the click cue when the action plays its own sound. */
  quiet?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-br from-brand to-accent shadow-[0_12px_32px_-14px_var(--color-brand)] hover:brightness-110 active:brightness-95',
  secondary:
    'text-ink bg-raised border border-line hover:border-brand-soft/60 hover:bg-surface',
  ghost: 'text-ink-soft hover:text-ink hover:bg-raised/70',
  danger:
    'text-white bg-gradient-to-br from-rose to-[#b91c1c] hover:brightness-110 active:brightness-95',
  subtle: 'text-ink-soft bg-raised/60 border border-line/70 hover:text-ink hover:bg-raised',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
  xl: 'h-14 px-8 text-lg gap-2.5 rounded-2xl',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  quiet = false,
  icon,
  block = false,
  className = '',
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      type={type}
      className={[
        'inline-flex select-none items-center justify-center font-semibold tracking-tight',
        'transition-all duration-200 ease-out active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      onClick={(event) => {
        if (!quiet) sound.play('click');
        onClick?.(event);
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
