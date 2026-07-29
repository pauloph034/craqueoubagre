import { cn } from "@/lib/utils";

export function SoccerFieldMarkings({
  className,
  variant = "full"
}: {
  className?: string;
  variant?: "full" | "attacking-half";
}) {
  if (variant === "attacking-half") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-0 text-[#efe6d2]",
          className
        )}
      >
        <span className="absolute bottom-[-1px] left-[15%] right-[15%] h-[32%] border border-current opacity-55" />
        <span className="absolute bottom-[-1px] left-[34%] right-[34%] h-[13%] border border-current opacity-55" />
        <span className="absolute bottom-0 left-[40%] right-[40%] h-[5%] border-x border-t border-current opacity-75" />
        <span className="absolute bottom-[23%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current opacity-65" />
        <span className="absolute bottom-[32%] left-1/2 h-[16%] w-[30%] -translate-x-1/2 translate-y-1/2 rounded-t-full border-t border-current opacity-45" />

        <span className="absolute inset-x-0 top-0 border-b border-current opacity-65" />
        <span className="absolute left-1/2 top-0 h-[34%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-55" />
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-65" />

        <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border border-current opacity-45" />
        <span className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full border border-current opacity-45" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 text-[#efe6d2]",
        className
      )}
    >
      <span className="absolute inset-x-0 top-1/2 border-t border-current opacity-55" />
      <span className="absolute left-1/2 top-1/2 h-[18%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-55" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-65" />

      <span className="absolute left-[18%] right-[18%] top-[-1px] h-[18%] border border-current opacity-55" />
      <span className="absolute left-[35%] right-[35%] top-[-1px] h-[7%] border border-current opacity-55" />
      <span className="absolute left-[41%] right-[41%] top-0 h-[2.5%] border-x border-b border-current opacity-75" />
      <span className="absolute left-1/2 top-[13%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current opacity-65" />
      <span className="absolute left-1/2 top-[18%] h-[7%] w-[20%] -translate-x-1/2 -translate-y-1/2 rounded-b-full border-b border-current opacity-45" />

      <span className="absolute bottom-[-1px] left-[18%] right-[18%] h-[18%] border border-current opacity-55" />
      <span className="absolute bottom-[-1px] left-[35%] right-[35%] h-[7%] border border-current opacity-55" />
      <span className="absolute bottom-0 left-[41%] right-[41%] h-[2.5%] border-x border-t border-current opacity-75" />
      <span className="absolute bottom-[13%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current opacity-65" />
      <span className="absolute bottom-[18%] left-1/2 h-[7%] w-[20%] -translate-x-1/2 translate-y-1/2 rounded-t-full border-t border-current opacity-45" />

      <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-current opacity-45" />
      <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-current opacity-45" />
      <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border border-current opacity-45" />
      <span className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full border border-current opacity-45" />
    </div>
  );
}
