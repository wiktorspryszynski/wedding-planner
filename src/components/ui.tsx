import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const control =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cx(control, className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cx(control, "pr-8", className)} {...p} />;
}

export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea rows={2} className={cx(control, className)} {...p} />;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Check({ label, ...p }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-[var(--accent)]" {...p} />
      {label}
    </label>
  );
}

const variants = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  ghost: "text-ink hover:bg-surface-2",
  outline: "border border-line bg-surface hover:bg-surface-2",
  danger: "text-danger hover:bg-rose-soft",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...p
}: ComponentProps<"button"> & { variant?: keyof typeof variants; size?: "sm" | "md" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm",
        variants[variant],
        className,
      )}
      {...p}
    />
  );
}

export function Card({ className, flush, ...p }: ComponentProps<"div"> & { flush?: boolean }) {
  return <div className={cx("rounded-2xl border border-line bg-surface", !flush && "p-4 sm:p-5", className)} {...p} />;
}

const tones = {
  neutral: "bg-surface-2 text-muted",
  green: "bg-accent-soft text-accent",
  rose: "bg-rose-soft text-rose",
  gold: "bg-gold-soft text-gold",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

/** Collapsible panel used for "add" and "edit" forms — no client JS needed. */
export function Disclosure({
  summary,
  children,
  open,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  return (
    <details open={open} className={cx("group", className)}>
      <summary>{summary}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function Progress({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "rose" | "gold" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = { accent: "bg-accent", rose: "bg-rose", gold: "bg-gold" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={cx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card flush className="p-3 sm:p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </Card>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
      ))}
    </div>
  );
}
