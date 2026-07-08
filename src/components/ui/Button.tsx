import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "seal";

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink-navy text-paper hover:bg-ink-navy/90",
  secondary: "bg-transparent text-ink-navy border border-hairline hover:bg-paper-raised",
  ghost: "bg-transparent text-ink-navy-soft hover:text-ink-navy",
  danger: "bg-transparent text-exception border border-exception/30 hover:bg-exception-tint",
  seal: "bg-brass text-paper hover:bg-brass/90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium",
          "transition-colors duration-fast ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          "disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
