import { forwardRef } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-sm border border-hairline bg-paper-raised px-3 py-2 text-sm text-ink-navy",
        "placeholder:text-ink-navy-soft/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
        "transition-colors duration-fast ease-out",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-sm border border-hairline bg-paper-raised px-3 py-2 text-sm text-ink-navy",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-navy-soft", className)}
      {...props}
    />
  );
}
