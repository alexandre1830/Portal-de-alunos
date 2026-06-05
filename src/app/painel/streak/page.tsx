import { redirect } from "next/navigation";

import { FlameIcon } from "@/components/icons/FlameIcon";
import { TargetIllustration } from "@/components/illustrations/TargetIllustration";
import { StreakCalendar } from "@/components/painel/StreakCalendar";
import { BackLink } from "@/components/shared/BackLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStreakData } from "@/lib/streak/queries";
import { createClient } from "@/lib/supabase/server";

function formatDate(iso: string): string {
  // "2026-06-05" ou ISO completo — extrai data e formata em PT-BR.
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function StreakPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const streak = await getStreakData(supabase, user.id, 84); // 12 semanas

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <BackLink href="/painel" label="Voltar ao painel" />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Seu streak</h1>
        <p className="text-sm text-fg-secondary">
          Streak é a sequência de dias seguidos em que você praticou. Cada
          dia com ao menos uma atividade conta.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-3 gap-3">
        <Card padded className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-2xl font-bold text-fg-primary">
            {streak.currentStreak}
            <FlameIcon className="h-5 w-5 text-warning" />
          </span>
          <span className="text-xs text-fg-secondary">Streak atual</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {streak.longestStreak}
          </span>
          <span className="text-xs text-fg-secondary">Maior streak</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {streak.activeDaysInPeriod}
          </span>
          <span className="text-xs text-fg-secondary">
            Dias ativos (12 sem)
          </span>
        </Card>
      </section>

      {/* Calendário */}
      <Card padded className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-fg-primary">
            Últimas 12 semanas
          </h2>
          <span className="text-xs text-fg-tertiary">
            Cada quadradinho é um dia
          </span>
        </div>
        {streak.activeDates.size === 0 ? (
          <EmptyState
            illustration={<TargetIllustration className="h-20 w-20" />}
            title="Comece seu streak"
            description="Pratique hoje para acender sua primeira chama. Mesmo um exercício já conta!"
          />
        ) : (
          <StreakCalendar activeDates={streak.activeDates} weeks={12} />
        )}
      </Card>

      {/* Última atividade */}
      {streak.lastActivityDate && (
        <Card padded className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-fg-primary">
            Última atividade
          </h2>
          <p className="text-sm text-fg-secondary">
            {formatDate(streak.lastActivityDate)}
          </p>
        </Card>
      )}
    </main>
  );
}
