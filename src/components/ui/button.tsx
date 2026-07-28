import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-transparent px-4 py-2 text-xs font-black uppercase tracking-[0.04em] transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "border-electric bg-electric text-white hover:border-black hover:bg-black",
        variant === "secondary" && "border-black bg-transparent text-black hover:bg-black hover:text-white",
        variant === "danger" && "bg-danger text-white hover:bg-red-700",
        variant === "ghost" && "text-black hover:bg-black hover:text-white",
        className
      )}
      {...props}
    />
  );
}
