import { cn } from "@/lib/utils/cn";

// Barra de progresso em segmentos discretos — útil quando o "progresso" é
// uma contagem de unidades independentes (ex.: partes concluídas de uma
// lição), e não um percentual contínuo.
//
// Cada segmento é renderizado como um pill arredondado. Segmentos completos
// usam bg-fg-primary; pendentes usam bg-bg-tertiary. A transição de width/
// background dá uma sensação de "preenchendo" quando recarrega após algo
// ficar pronto.
export function SegmentedProgressBar({
  value,
  max,
  className,
  ariaLabel,
  filledClassName = "bg-primary-brand",
}: {
  value: number;
  max: number;
  className?: string;
  ariaLabel?: string;
  // Classe usada nos segmentos preenchidos. Default mantém o azul da
  // marca (preserva todos os callers existentes); o dashboard do aluno
  // sobrescreve com bg-accent-progress.
  filledClassName?: string;
}) {
  const safeMax = Math.max(0, Math.floor(max));
  const safeValue = Math.max(0, Math.min(Math.floor(value), safeMax));

  // Sem segmentos: ainda renderiza um stub vazio para preservar layout.
  if (safeMax === 0) {
    return (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={0}
        aria-valuenow={0}
        aria-label={ariaLabel}
        className={cn(
          "h-1.5 w-full rounded-full bg-bg-tertiary",
          className,
        )}
      />
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      aria-label={ariaLabel}
      className={cn("flex w-full items-center gap-1", className)}
    >
      {Array.from({ length: safeMax }).map((_, i) => {
        const done = i < safeValue;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              done ? filledClassName : "bg-bg-tertiary",
            )}
          />
        );
      })}
    </div>
  );
}
