import type { ReactElement, ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { sound } from '../../lib/sound';

/* ------------------------------------------------------------- toggle */

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}): ReactElement {
  return (
    <label
      className={`flex items-center justify-between gap-4 py-2.5 ${
        disabled ? 'opacity-50' : 'cursor-pointer'
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          sound.play('click');
          onChange(!checked);
        }}
        className={[
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200',
          checked
            ? 'border-transparent bg-gradient-to-r from-brand to-accent'
            : 'border-line bg-raised',
        ].join(' ')}
      >
        <span
          className={[
            // `left-0` is required: without it the static position of an
            // absolute child follows the button's text alignment.
            'absolute top-0.5 left-0 size-4.5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[1.45rem]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------ stepper */

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 180,
  step = 1,
  label,
  unit,
  description,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
  description?: string;
}): ReactElement {
  const clamp = (next: number): number => Math.min(max, Math.max(min, next));
  const inputId = `stepper-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line bg-raised/70 p-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="grid size-8 place-items-center rounded-lg text-ink-soft transition hover:bg-surface hover:text-ink disabled:opacity-40"
          disabled={value <= min}
          onClick={() => {
            sound.play('click');
            onChange(clamp(value - step));
          }}
        >
          <Minus size={15} aria-hidden />
        </button>
        <div className="flex items-baseline gap-1 px-1">
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            className="num w-10 bg-transparent text-center text-base font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            value={value}
            min={min}
            max={max}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onChange(clamp(next));
            }}
          />
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="grid size-8 place-items-center rounded-lg text-ink-soft transition hover:bg-surface hover:text-ink disabled:opacity-40"
          disabled={value >= max}
          onClick={() => {
            sound.play('click');
            onChange(clamp(value + step));
          }}
        >
          <Plus size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------- segmented control */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: {
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  className?: string;
}): ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex flex-wrap gap-1 rounded-2xl border border-line bg-raised/50 p-1 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => {
              sound.play('click');
              onChange(option.value);
            }}
            className={[
              'flex-1 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200',
              selected
                ? 'bg-gradient-to-br from-brand to-accent text-white shadow-[0_8px_24px_-14px_var(--color-brand)]'
                : 'text-ink-soft hover:bg-surface hover:text-ink',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- text input */

export function TextField({
  value,
  onChange,
  label,
  placeholder,
  maxLength = 120,
  optional = false,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder?: string;
  maxLength?: number;
  optional?: boolean;
  id?: string;
}): ReactElement {
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted uppercase"
      >
        {label}
        {optional && <span className="ml-1.5 text-faint normal-case">(optional)</span>}
      </label>
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line bg-raised/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-brand-soft/70 focus:outline-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------- slider */

export function Slider({
  value,
  onChange,
  label,
  min = 0,
  max = 1,
  step = 0.05,
  format,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
}): ReactElement {
  const inputId = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span className="num text-xs text-muted">{format ? format(value) : value}</span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-brand)]"
      />
    </div>
  );
}

/* -------------------------------------------------------- empty state */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-line bg-raised/60 text-2xl">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
