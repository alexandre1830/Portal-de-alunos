import Link from "next/link";
import { redirect } from "next/navigation";

import { BookmarkIcon } from "@/components/icons/BookmarkIcon";
import { FlameIcon } from "@/components/icons/FlameIcon";
import { GearIcon } from "@/components/icons/GearIcon";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { StudyIllustration } from "@/components/illustrations/StudyIllustration";
import { Avatar } from "@/components/shared/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStudentDashboard } from "@/lib/dashboard/queries";
import { countDueItems } from "@/lib/srs/queries";
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

  const [{ data: profile }, dashboard, srsDue] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role, avatar_url")
      .eq("id", user.id)
      .single(),
    getStudentDashboard(supabase, user.id),
    countDueItems(supabase, user.id),
  ]);

  const xp = dashboard.gamification?.total_xp ?? 0;
  const streak = dashboard.gamification?.current_streak ?? 0;
  const longest = dashboard.gamification?.longest_streak ?? 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg-secondary">
          Portal de alunos
        </span>
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
        <Avatar
          src={profile?.avatar_url ?? null}
          fullName={profile?.full_name}
          email={profile?.email ?? user.email ?? ""}
          size="lg"
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-fg-primary">
            Olá{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </h1>
          <p className="text-sm text-fg-secondary">
            {profile ? ROLE_LABELS[profile.role] : "—"} ·{" "}
            {profile?.email ?? user.email}
          </p>
        </div>
      </div>

      {/* Gamificação */}
      <section className="grid grid-cols-3 gap-3">
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">{xp}</span>
          <span className="text-xs text-fg-secondary">XP total</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-2xl font-bold text-fg-primary">
            {streak}
            <FlameIcon className="h-5 w-5 text-warning" />
          </span>
          <span className="text-xs text-fg-secondary">Streak atual</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">{longest}</span>
          <span className="text-xs text-fg-secondary">Maior streak</span>
        </Card>
      </section>

      {/* Atalhos: revisar manualmente + conquistas */}
      <section className="grid grid-cols-2 gap-3">
        <Link href="/painel/revisar" className="block">
          <Card padded interactive className="flex h-full items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-fg-primary">
              <BookmarkIcon className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-fg-primary">
                Para revisar
              </span>
              <span className="text-xs text-fg-tertiary">
                Suas marcações e a fila SRS
              </span>
            </span>
          </Card>
        </Link>
        <Link href="/painel/conquistas" className="block">
          <Card padded interactive className="flex h-full items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-warning">
              <TrophyIcon className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-fg-primary">
                Conquistas
              </span>
              <span className="text-xs text-fg-tertiary">
                {dashboard.achievementsCount}{" "}
                {dashboard.achievementsCount === 1 ? "ganha" : "ganhas"}
              </span>
            </span>
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
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fg-primary/10 text-fg-primary">
                <span className="absolute inset-0 animate-ping rounded-full bg-fg-primary/20" />
                <span className="relative text-base font-semibold">
                  {srsDue > 99 ? "99+" : srsDue}
                </span>
              </span>
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
            <span className="shrink-0 rounded-md bg-fg-primary px-3 py-1.5 text-xs font-medium text-fg-inverse">
              Começar
            </span>
          </Card>
        </Link>
      )}

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
            {dashboard.courses.map((course, i) => (
              <li
                key={course.id}
                className="animate-fade-slide-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Link href={`/cursos/${course.slug}`} className="block">
                  <Card
                    padded
                    interactive
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-fg-primary">
                        {course.title}
                      </span>
                      {course.description && (
                        <span className="text-sm text-fg-secondary">
                          {course.description}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full border border-border-primary px-2.5 py-1 text-xs text-fg-secondary">
                      {LANGUAGE_LABELS[course.language]} · {levelLabel(course.level)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
