import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-electric text-night hover:bg-sky-300",
        variant === "secondary" && "border border-white/15 bg-white/10 text-white hover:bg-white/15",
        variant === "danger" && "bg-danger text-white hover:bg-rose-400",
        variant === "ghost" && "text-slate-100 hover:bg-white/10",
        className
      )}
      {...props}
    />
  );
}
