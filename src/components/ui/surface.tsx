import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function GamePanel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,27,55,.84),rgba(3,9,24,.88))] shadow-[0_18px_48px_rgba(0,0,0,.28)]",
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
        {eyebrow && <p className="text-xs font-black uppercase tracking-[0.22em] text-mint">{eyebrow}</p>}
        <h1 className="mt-1 text-balance font-display text-3xl font-black leading-none text-slate-50 md:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-black text-white">{value}</p>
    </div>
  );
}
