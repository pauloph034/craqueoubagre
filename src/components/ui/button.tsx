import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-electric text-night shadow-[0_8px_24px_rgba(40,184,255,.16)] hover:bg-sky-300",
        variant === "secondary" && "border border-white/12 bg-white/[0.055] text-white hover:border-electric/30 hover:bg-white/10",
        variant === "danger" && "bg-danger text-white hover:bg-rose-400",
        variant === "ghost" && "text-slate-100 hover:bg-white/10",
        className
      )}
      {...props}
    />
  );
}
