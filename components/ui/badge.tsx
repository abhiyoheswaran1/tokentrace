import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium leading-none outline-solid outline-1 -outline-offset-1",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground outline-transparent",
        secondary: "bg-muted text-muted-foreground outline-transparent",
        outline: "text-foreground outline-[hsl(35_18%_84%)]",
        warning: "bg-amber-50 text-amber-800 outline-amber-300",
        success: "bg-emerald-50 text-emerald-800 outline-emerald-300",
        destructive: "bg-red-50 text-red-800 outline-red-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
