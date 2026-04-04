import { cn } from "@/lib/utils";
import * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "flex h-10 w-full min-w-0 rounded-xl border px-4 py-2.5 text-sm",
        "bg-white text-[#2C2416] placeholder:text-[#A89E8F]",
        // Bordo default
        "border-[#DDD6C8]",
        // Focus — verde menta
        "outline-none transition-colors",
        "focus-visible:border-[#7DBE9E] focus-visible:ring-2 focus-visible:ring-[#7DBE9E]/20 focus-visible:ring-offset-0",
        // Stato errore
        "aria-invalid:border-[#E07A7A] aria-invalid:ring-2 aria-invalid:ring-[#E07A7A]/20",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // File input
        "file:text-[#2C2416] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

