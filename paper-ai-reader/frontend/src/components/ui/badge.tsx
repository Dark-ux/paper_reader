import * as React from "react";

import { cn } from "../../utils/cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm border bg-accent px-2 text-xs font-medium text-accent-foreground",
        className
      )}
      {...props}
    />
  );
}
