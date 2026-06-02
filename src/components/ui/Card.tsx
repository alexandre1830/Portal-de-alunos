import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const cardVariants = cva(
  "rounded-lg border border-border-primary bg-bg-secondary text-fg-primary",
  {
    variants: {
      padded: {
        true: "p-6",
        false: "p-4",
      },
      interactive: {
        true: "transition-colors hover:border-border-secondary hover:bg-bg-tertiary",
        false: "",
      },
    },
    defaultVariants: {
      padded: false,
      interactive: false,
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padded, interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ padded, interactive }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
