import Link from "next/link";
import { redirect } from "next/navigation";

import { BookmarkIcon } from "@/components/icons/BookmarkIcon";
import { FlameIcon } from "@/components/icons/FlameIcon";
import { GearIcon } from "@/components/icons/GearIcon";
import { RepeatIcon } from "@/components/icons/RepeatIcon";
import { SparkleIcon } from "@/components/icons/SparkleIcon";
import { TrendingUpIcon } from "@/components/icons/TrendingUpIcon";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { StudyIllustration } from "@/components/illustrations/StudyIllustration";
import { AvatarEditor } from "@/components/painel/AvatarEditor";
import { UpcomingLiveSessionCard } from "@/components/painel/UpcomingLiveSessionCard";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedProgressBar } from "@/components/ui/SegmentedProgressBar";
import { getStudentDashboard } from "@/lib/dashboard/queries";
import { listStudentLiveSessions } from "@/lib/live-sessions/queries";
import { countDueItems } from "@/lib/srs/queries";
import { resolveCurrentStreak } from "@/lib/streak/queries";
import { createClient } from "@/lib/supabase/server";
import type { CefrLevel, CourseLanguage } from "@/types/content";
import type { UserRole } from "@/types/user";

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Aluno",
  teacher: "Professor",
  admin: "Administrador",
};

const LANGUAGE_LABELS: Record<CourseLanguage, string> = {
  en: "Inglês",
  es: "Espanhol",
};

function levelLabel(level: CefrLevel): string {
  return level.toUpperCase();
}

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa em profundidade: o proxy já protege /painel, mas não confiamos só
  // nele para renderizar dados do usuário.
  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, dashboard, srsDue, liveSessions] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role, avatar_url")
      .eq("id", user.id)
      .single(),
    getStudentDashboard(supabase, user.id),
    countDueItems(supabase, user.id),
    listStudentLiveSessions(supabase, user.id),
  ]);

  const xp = dashboard.gamification?.total_xp ?? 0;
  const streak = resolveCurrentStreak(
    dashboard.gamification?.current_streak,
    dashboard.gamification?.last_activity_date,
  );
  const longest = dashboard.gamification?.longest_streak ?? 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <Link
          href="/painel"
          className="flex items-center gap-2 text-sm font-medium text-fg-secondary"
        >
          <Logo className="h-7 w-7" />
          Portal de Alunos
        </Link>
        <div className="flex items-center gap-3">
          {(profile?.role === "teacher" || profile?.role === "admin") && (
            <Link
              href="/professor"
              className="text-sm font-medium text-fg-secondary hover:text-fg-primary"
            >
              Professor
            </Link>
          )}
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-fg-secondary hover:text-fg-primary"
            >
              Admin
            </Link>
          )}
          <Link
            href="/painel/configuracoes"
            aria-label="Configurações"
            title="Configurações"
            className="rounded p-1.5 text-fg-secondary transition-colors hover:bg-bg-secondary hover:text-fg-primary"
          >
            <GearIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <AvatarEditor
          initialSrc={profile?.avatar_url ?? null}
          fullName={profile?.full_name ?? null}
          email={profile?.email ?? user.email ?? ""}
          size="lg"
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-fg-primary">
            Olá{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </h1>
          <p className="text-sm text-fg-secondary">
            {profile?.email ?? user.email}
          </p>
        </div>
      </div>

      {/* Gamificação — cada KPI ganha um badge circular com ícone na cor
          da marca (azul-marinho), padrão do sistema irmão. */}
      <section className="grid grid-cols-3 gap-3">
        <Link href="/painel/xp" className="block">
          <Card
            padded
            interactive
            className="flex h-full items-center gap-3"
            title="Ver histórico de XP"
          >
            <KpiIcon>
              <SparkleIcon className="h-5 w-5" />
            </KpiIcon>
            <span className="flex flex-col">
              <span className="text-2xl font-bold leading-none text-fg-primary">
                {xp}
              </span>
              <span className="mt-1 text-xs text-fg-secondary">XP total</span>
            </span>
          </Card>
        </Link>
        <Link href="/painel/streak" className="block">
          <Card
            padded
            interactive
            className="flex h-full items-center gap-3"
            title="Ver calendário de streak"
          >
            <KpiIcon>
              <FlameIcon className="h-5 w-5" />
            </KpiIcon>
            <span className="flex flex-col">
              <span className="text-2xl font-bold leading-none text-fg-primary">
                {streak}
              </span>
              <span className="mt-1 text-xs text-fg-secondary">
                Streak atual
              </span>
            </span>
          </Card>
        </Link>
        <Link href="/painel/streak" className="block">
          <Card
            padded
            interactive
            className="flex h-full items-center gap-3"
            title="Ver calendário de streak"
          >
            <KpiIcon>
              <TrendingUpIcon className="h-5 w-5" />
            </KpiIcon>
            <span className="flex flex-col">
              <span className="text-2xl font-bold leading-none text-fg-primary">
                {longest}
              </span>
              <span className="mt-1 text-xs text-fg-secondary">
                Maior streak
              </span>
            </span>
          </Card>
        </Link>
      </section>

      {/* Atalhos: revisar manualmente + conquistas */}
      <section className="grid grid-cols-2 gap-3">
        <Link href="/painel/revisar" className="block">
          <Card padded interactive className="flex h-full items-center gap-3">
            <KpiIcon>
              <BookmarkIcon className="h-5 w-5" />
            </KpiIcon>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-fg-primary">
                Para revisar
              </span>
              <span className="text-xs text-fg-tertiary">
                Suas marcações
              </span>
            </span>
          </Card>
        </Link>
        <Link href="/painel/conquistas" className="block">
          <Card
            padded
            interactive
            className={
              "relative flex h-full items-center gap-3" +
              (dashboard.claimableCount > 0 ? " border-warning/40" : "")
            }
          >
            <KpiIcon>
              <TrophyIcon className="h-5 w-5" />
            </KpiIcon>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-fg-primary">
                Conquistas
              </span>
              <span className="text-xs text-fg-tertiary">
                {dashboard.achievementsCount}{" "}
                {dashboard.achievementsCount === 1 ? "coletada" : "coletadas"}
              </span>
            </span>
            {/* Badge "X para coletar" — chama a atenção do aluno para
                conquistas atingidas mas ainda não coletadas. */}
            {dashboard.claimableCount > 0 && (
              <span className="absolute right-3 top-3 inline-flex animate-pulse items-center rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-bg-primary">
                {dashboard.claimableCount} para coletar
              </span>
            )}
          </Card>
        </Link>
      </section>

      {/* Revisão espaçada — só aparece quando há itens prontos.
          Recebe accent visual + pulse no contador para chamar atenção. */}
      {srsDue > 0 && (
        <Link href="/painel/revisar/sessao" className="block">
          <Card
            padded
            interactive
            accent
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <KpiIcon>
                <RepeatIcon className="h-5 w-5" />
              </KpiIcon>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-fg-primary">
                  {srsDue === 1
                    ? "1 revisão pronta"
                    : `${srsDue} revisões prontas`}
                </span>
                <span className="text-xs text-fg-tertiary">
                  Comece sua sessão de revisão espaçada.
                </span>
              </div>
            </div>
            <Button type="button" size="sm" className="shrink-0">
              Começar
            </Button>
          </Card>
        </Link>
      )}

      {/* Card de aula síncrona: mostra a próxima aula recorrente cadastrada
          pelo admin (com link do Meet). Só renderiza se houver aula. */}
      <UpcomingLiveSessionCard sessions={liveSessions} />

      {/* Cursos matriculados */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Meus cursos</h2>

        {dashboard.courses.length === 0 ? (
          <Card padded>
            <EmptyState
              illustration={<StudyIllustration className="h-20 w-20" />}
              title="Sem matrículas ainda"
              description="Assim que seu professor liberar a sua matrícula, os cursos vão aparecer aqui."
            />
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {dashboard.courses.map((course, i) => {
              const cont = dashboard.continueByCourseId.get(course.id);
              const courseDone =
                cont &&
                cont.partsTotalInCourse > 0 &&
                cont.partsDoneInCourse === cont.partsTotalInCourse;
              return (
                <li
                  key={course.id}
                  className="animate-fade-slide-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Card padded className="flex flex-col gap-3">
                    {/* Header: nome do curso (link sutil pra visão geral)
                        + pill idioma/nível. */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/cursos/${course.slug}`}
                          className="self-start font-medium text-fg-primary transition-colors hover:text-primary-brand"
                          title="Ver todas as lições do curso"
                        >
                          {course.title}
                        </Link>
                        {course.description && (
                          <span className="text-sm text-fg-secondary">
                            {course.description}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-border-primary px-2.5 py-1 text-xs text-fg-secondary">
                        {LANGUAGE_LABELS[course.language]} ·{" "}
                        {levelLabel(course.level)}
                      </span>
                    </div>

                    {/* Preview da lição atual + barra + botão Continuar.
                        Separada do header por uma borda fina superior —
                        sem fundo nem caixa extra para evitar a sensação
                        de "card dentro de card". */}
                    {cont && cont.partsTotalInCourse > 0 ? (
                      <div className="flex flex-col gap-3 border-t border-border-primary pt-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-xs uppercase tracking-wide text-fg-tertiary">
                              {courseDone
                                ? "Curso concluído"
                                : "Continue de onde parou"}
                            </span>
                            {cont.nextLessonTitle && (
                              <span className="text-sm font-medium text-fg-primary">
                                {cont.nextLessonTitle}
                              </span>
                            )}
                          </div>
                          {cont.nextPartId && (
                            <Link href={`/partes/${cont.nextPartId}`}>
                              <Button type="button" size="sm">
                                {courseDone ? "Revisar" : "Continuar"}
                              </Button>
                            </Link>
                          )}
                        </div>
                        <SegmentedProgressBar
                          value={cont.partsDoneInLesson}
                          max={cont.partsTotalInLesson}
                          ariaLabel="Progresso na lição"
                        />
                      </div>
                    ) : (
                      // Curso sem partes publicadas ainda — só oferece
                      // o link para a estrutura do curso.
                      <Link
                        href={`/cursos/${course.slug}`}
                        className="self-start text-sm text-fg-secondary transition-colors hover:text-primary-brand"
                      >
                        Ver curso →
                      </Link>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

// Badge circular para o ícone de um KPI/card de atalho.
// bg = primary-brand-surface (azul muito claro), ícone = primary-brand
// (azul-marinho da marca). Mesmo padrão dos stat-cards do sistema irmão.
function KpiIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-brand-surface text-primary-brand">
      {children}
    </span>
  );
}
