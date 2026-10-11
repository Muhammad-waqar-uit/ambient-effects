import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-chip px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors",
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";
