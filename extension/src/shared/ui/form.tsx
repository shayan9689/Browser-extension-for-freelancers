import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconCheck, IconPlus, IconX } from './icons';

export function Card(props: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pp-card flex flex-col gap-4 p-5 ${props.className ?? ''}`}>
      <div className="flex items-start gap-3">
        {props.icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--pp-brand-soft)] text-[var(--pp-brand-strong)]">
            {props.icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold tracking-tight">{props.title}</h2>
          {props.subtitle ? (
            <p className="pp-muted mt-0.5 text-xs leading-relaxed">{props.subtitle}</p>
          ) : null}
        </div>
        {props.aside}
      </div>
      {props.children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="pp-label">
        {label}
        {required ? <span className="ml-0.5 text-[var(--pp-brand-strong)]">*</span> : null}
      </label>
      {children(id)}
      {error ? (
        <span className="text-xs text-[var(--pp-danger)]" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="pp-faint text-[11px] leading-relaxed">{hint}</span>
      ) : null}
    </div>
  );
}

export function Segment<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="pp-segment" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={props.value === o}
          onClick={() => props.onChange(o)}
        >
          {props.labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function Meter(props: { value: number; size?: number }) {
  const size = props.size ?? 38;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex shrink-0 items-center gap-2" title="Profile completeness">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="pp-meter" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--pp-border)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#pp-meter)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * props.value) / 100}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <span className="text-xs font-bold tabular-nums">
        {props.value}%<span className="sr-only"> profile complete</span>
      </span>
    </div>
  );
}

function onEnter(action: () => void) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };
}

/** Tag input: type and press Enter (or comma) to add; click a chip to remove. */
export function ChipInput(props: {
  id: string;
  values: string[];
  max: number;
  placeholder: string;
  suggestions?: string[];
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...props.values];
    for (const item of items) {
      if (next.length >= props.max) break;
      if (!next.some((v) => v.toLowerCase() === item.toLowerCase())) next.push(item);
    }
    props.onChange(next);
    setInput('');
  };
  const suggestions = (props.suggestions ?? []).filter(
    (s) => !props.values.some((v) => v.toLowerCase() === s.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-2">
      {props.values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {props.values.map((s) => (
            <button
              key={s}
              type="button"
              className="pp-chip pp-chip-btn"
              aria-label={`Remove ${s}`}
              onClick={() => props.onChange(props.values.filter((x) => x !== s))}
            >
              {s}
              <IconX size={11} />
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          id={props.id}
          className="pp-input"
          value={input}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(',')) add(v);
            else setInput(v);
          }}
          onKeyDown={onEnter(() => add(input))}
          placeholder={props.placeholder}
          disabled={props.values.length >= props.max}
        />
        <button
          type="button"
          className="pp-btn pp-btn-secondary"
          onClick={() => add(input)}
          disabled={!input.trim() || props.values.length >= props.max}
        >
          <IconPlus size={14} />
          Add
        </button>
      </div>
      {suggestions.length > 0 && props.values.length < props.max ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="pp-faint text-[11px]">Suggestions:</span>
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              className="pp-chip pp-chip-btn opacity-80 hover:opacity-100"
              onClick={() => add(s)}
            >
              <IconPlus size={10} />
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** List of short sentences, e.g. achievements. */
export function ListInput(props: {
  id: string;
  values: string[];
  max: number;
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v || props.values.includes(v) || props.values.length >= props.max) return;
    props.onChange([...props.values, v]);
    setInput('');
  };
  return (
    <div className="flex flex-col gap-2">
      {props.values.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {props.values.map((h) => (
            <li
              key={h}
              className="flex items-start gap-2 rounded-lg border border-[var(--pp-border)] bg-[var(--pp-surface-2)] p-2.5 text-xs leading-relaxed"
            >
              <span className="mt-0.5 text-[var(--pp-brand-strong)]">
                <IconCheck size={13} />
              </span>
              <span className="flex-1">{h}</span>
              <button
                type="button"
                className="pp-icon-btn !h-6 !w-6"
                aria-label="Remove"
                onClick={() => props.onChange(props.values.filter((x) => x !== h))}
              >
                <IconX size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={props.id}
          className="pp-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEnter(add)}
          placeholder={props.placeholder}
          disabled={props.values.length >= props.max}
        />
        <button
          type="button"
          className="pp-btn pp-btn-secondary"
          onClick={add}
          disabled={!input.trim() || props.values.length >= props.max}
        >
          <IconPlus size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
