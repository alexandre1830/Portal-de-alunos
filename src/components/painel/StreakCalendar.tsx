import { FlameIcon } from "@/components/icons/FlameIcon";
import { cn } from "@/lib/utils/cn";

// Calendário tipo "heatmap" inspirado no Duolingo. Mostra os últimos
// `weeks` x 7 dias em colunas (uma coluna por semana, 7 linhas seg→dom).
// Dias com atividade ficam preenchidos; sem atividade ficam vazios.
// O dia de "hoje" tem um anel sutil.

const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]; // seg→dom

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "short" });
}

export function StreakCalendar({
  activeDates,
  weeks = 12,
  className,
}: {
  activeDates: Set<string>;
  weeks?: number;
  className?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toISODate(today);

  // Encontra a segunda-feira da semana de hoje (Date.getDay() devolve 0=dom..6=sab).
  const dayOfWeek = today.getDay();
  const offsetToMonday = (dayOfWeek + 6) % 7; // 0=seg ... 6=dom
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - offsetToMonday);

  // Primeira segunda do grid: weeks-1 semanas antes da segunda atual.
  const firstMonday = new Date(thisMonday);
  firstMonday.setDate(thisMonday.getDate() - (weeks - 1) * 7);

  // Monta a matriz: 7 linhas × weeks colunas, em dias incrementais.
  // Cada coluna é uma semana; dentro da coluna, dias seg→dom (top→bottom).
  type Cell = {
    date: Date;
    key: string;
    isFuture: boolean;
    active: boolean;
    isToday: boolean;
  };
  const columns: Cell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: Cell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(firstMonday);
      d.setDate(firstMonday.getDate() + w * 7 + dow);
      const key = toISODate(d);
      col.push({
        date: d,
        key,
        isFuture: d.getTime() > today.getTime(),
        active: activeDates.has(key),
        isToday: key === todayKey,
      });
    }
    columns.push(col);
  }

  // Para o eixo X com meses, marcamos a primeira coluna em que o mês mudou.
  const monthMarkers: { columnIndex: number; label: string }[] = [];
  let lastMonth = -1;
  for (let c = 0; c < columns.length; c++) {
    const firstDay = columns[c]![0]!.date;
    if (firstDay.getMonth() !== lastMonth) {
      monthMarkers.push({ columnIndex: c, label: monthLabel(firstDay) });
      lastMonth = firstDay.getMonth();
    }
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex gap-2">
        {/* Coluna de rótulos dos dias da semana */}
        <div className="flex flex-col justify-between py-0.5">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={i}
              className="text-[10px] leading-none text-fg-tertiary"
              aria-hidden="true"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid de células */}
        <div
          role="grid"
          aria-label="Calendário de prática"
          className="flex flex-1 gap-1"
        >
          {columns.map((col, ci) => (
            <div
              key={ci}
              role="row"
              className="flex flex-1 flex-col gap-1"
            >
              {col.map((cell) => (
                <Cell key={cell.key} cell={cell} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Linha de rótulos dos meses */}
      <div className="flex gap-1 pl-5">
        {columns.map((_, ci) => {
          const marker = monthMarkers.find((m) => m.columnIndex === ci);
          return (
            <span
              key={ci}
              className="flex-1 text-center text-[10px] text-fg-tertiary"
              aria-hidden="true"
            >
              {marker?.label}
            </span>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-1 flex items-center gap-3 text-[10px] text-fg-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-bg-tertiary" />
          Sem prática
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-sm bg-warning/20 text-warning">
            <FlameIcon className="h-2 w-2" />
          </span>
          Praticou
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-fg-primary bg-bg-tertiary" />
          Hoje
        </span>
      </div>
    </div>
  );
}

function Cell({
  cell,
}: {
  cell: {
    date: Date;
    key: string;
    isFuture: boolean;
    active: boolean;
    isToday: boolean;
  };
}) {
  if (cell.isFuture) {
    // Dia futuro: célula transparente para preservar o grid sem destaque.
    return <div className="aspect-square min-w-0" role="gridcell" />;
  }
  return (
    <div
      role="gridcell"
      title={`${cell.date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}${cell.active ? " — praticou" : ""}`}
      className={cn(
        "flex aspect-square min-w-0 items-center justify-center rounded-sm transition-colors",
        cell.active
          ? "bg-warning/20 text-warning"
          : "bg-bg-tertiary",
        cell.isToday && "ring-1 ring-fg-primary",
      )}
    >
      {cell.active && (
        <FlameIcon className="h-2.5 w-2.5" />
      )}
    </div>
  );
}
