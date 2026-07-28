import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function EditorialPageHeader({
  chapter,
  title,
  description,
  action,
  className
}: {
  chapter: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-black/25 pb-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="editorial-kicker">{chapter}</p>
          <h1 className="editorial-page-title mt-2">{title}</h1>
          {description && <p className="editorial-muted mt-2 max-w-2xl">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function EditorialSection({
  number,
  title,
  action,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  number?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn("editorial-panel", className)} {...props}>
      {(number || title || action) && (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-black/20 px-4 py-2">
          <div className="flex items-center gap-3">
            {number && <span className="editorial-number text-lg">{number}</span>}
            {title && <h2 className="text-sm font-black uppercase">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function CompactStat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0 border-l border-black/20 px-3 first:border-l-0">
      <p className={cn("font-display text-xl font-black leading-none", accent && "text-[var(--accent)]")}>{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function CompactTabs({
  items,
  value,
  onChange,
  className
}: {
  items: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex border-b border-black/25", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={cn(
            "min-h-10 border-b-2 border-transparent px-4 text-xs font-black uppercase transition",
            value === item.value ? "border-[var(--accent)] text-[var(--accent)]" : "text-[var(--muted)] hover:text-black"
          )}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span className="ml-1 font-mono">({item.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function StatusLabel({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "warning" }) {
  const tones = {
    neutral: "border-black/25 text-black",
    accent: "border-[var(--accent)] bg-[var(--accent)] text-white",
    success: "border-[var(--success)] text-[var(--success)]",
    warning: "border-[var(--warning)] text-[var(--warning)]"
  };
  return <span className={cn("inline-flex min-h-6 items-center border px-2 text-[9px] font-black uppercase tracking-[0.12em]", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border border-dashed border-black/35 p-5">
      <p className="font-display text-xl font-black uppercase">{title}</p>
      {description && <p className="editorial-muted mt-1">{description}</p>}
    </div>
  );
}
