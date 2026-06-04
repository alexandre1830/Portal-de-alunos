import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const cardVariants = cva(
  // transition-all sempre presente para reagir suavemente a qualquer hover.
  "rounded-lg border border-border-primary bg-bg-secondary text-fg-primary transition-all duration-200",
  {
    variants: {
      padded: {
        true: "p-6",
        false: "p-4",
      },
      interactive: {
        // Hover: levanta um pixel, sombra suave, borda + bg respondem.
        // Active: volta para o lugar e dá um leve scale para sensação de clique.
        true: "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-border-secondary hover:bg-bg-tertiary active:translate-y-0 active:scale-[0.99]",
        false: "",
      },
      accent: {
        // Acento de cor para chamar atenção (ex.: SRS com itens prontos).
        true: "border-fg-primary/40 ring-2 ring-fg-primary/10",
        false: "",
      },
    },
    defaultVariants: {
      padded: false,
      interactive: false,
      accent: false,
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padded, interactive, accent, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ padded, interactive, accent }),
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
