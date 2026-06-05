import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/BackLink";
import { Stars } from "@/components/shared/Stars";
import { Card } from "@/components/ui/Card";
import { getCourseStudents } from "@/lib/professor/queries";
import { requireTeacher } from "@/lib/professor/guard";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMin = Math.floor((now - t) / 60_000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function ProfessorCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const { supabase } = await requireTeacher();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, language, level, is_published")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const { totalParts, students } = await getCourseStudents(supabase, courseId);

  const completedAll = students.filter(
    (s) => totalParts > 0 && s.partsCompleted === totalParts,
  ).length;
  const inProgress = students.filter(
    (s) => s.partsCompleted > 0 && s.partsCompleted < totalParts,
  ).length;
  const notStarted = students.filter((s) => s.partsCompleted === 0).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <BackLink href="/professor/cursos" label="Meus cursos" />
        <h1 className="text-2xl font-semibold text-fg-primary">{course.title}</h1>
        <span className="text-sm text-fg-secondary">
          {course.language.toUpperCase()} · {course.level.toUpperCase()} ·{" "}
          {totalParts} {totalParts === 1 ? "parte" : "partes"}
        </span>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {students.length}
          </span>
          <span className="text-xs text-fg-secondary">Matriculados</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">{inProgress}</span>
          <span className="text-xs text-fg-secondary">Em andamento</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {completedAll}
          </span>
          <span className="text-xs text-fg-secondary">Concluíram tudo</span>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Alunos · desempenho
        </h2>

        {students.length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">
              Nenhum aluno matriculado neste curso ainda.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {students.map((s) => {
              const pct =
                totalParts > 0
                  ? Math.round((s.partsCompleted / totalParts) * 100)
                  : 0;
              return (
                <li key={s.userId}>
                  <Link
                    href={`/professor/cursos/${course.id}/alunos/${s.userId}`}
                  >
                    <Card
                      padded
                      interactive
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-fg-primary">
                          {s.fullName ?? s.email}
                        </span>
                        {s.fullName && (
                          <span className="text-xs text-fg-tertiary">
                            {s.email}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-fg-secondary">
                        <span>
                          <span className="text-fg-primary">
                            {s.partsCompleted}
                          </span>
                          {" / "}
                          {totalParts}{" "}
                          <span className="text-xs">({pct}%)</span>
                        </span>
                        {s.partsCompleted > 0 && (
                          <Stars value={Math.round(s.averageStars)} />
                        )}
                        <span className="text-xs text-fg-tertiary">
                          {formatRelative(s.lastActivity)}
                        </span>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {notStarted > 0 && (
          <p className="text-xs text-fg-tertiary">
            {notStarted}{" "}
            {notStarted === 1 ? "aluno ainda não começou" : "alunos ainda não começaram"}.
          </p>
        )}
      </section>
    </div>
  );
}
