import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function GamePanel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-sm border border-black/25 bg-white shadow-none",
        className
      )}
      {...props}
    />
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="editorial-kicker">{eyebrow}</p>}
        <h1 className="editorial-page-title mt-2 text-balance">{title}</h1>
        {description && <p className="editorial-muted mt-2 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-sm border border-black/20 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-2xl font-black text-black">{value}</p>
    </div>
  );
}
