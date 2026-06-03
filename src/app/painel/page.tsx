import Link from "next/link";
import { redirect } from "next/navigation";

import { FlameIcon } from "@/components/icons/FlameIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { signOut } from "@/lib/auth/actions";
import { getStudentDashboard } from "@/lib/dashboard/queries";
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

  const [{ data: profile }, dashboard] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .single(),
    getStudentDashboard(supabase, user.id),
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-fg-primary">
          Olá{profile?.full_name ? `, ${profile.full_name}` : ""}!
        </h1>
        <p className="text-sm text-fg-secondary">
          {profile ? ROLE_LABELS[profile.role] : "—"} ·{" "}
          {profile?.email ?? user.email}
        </p>
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

      {/* Cursos matriculados */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Meus cursos</h2>

        {dashboard.courses.length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">
              Você ainda não está matriculado em nenhum curso. Assim que sua
              matrícula for liberada, os cursos aparecem aqui.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {dashboard.courses.map((course) => (
              <li key={course.id}>
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
