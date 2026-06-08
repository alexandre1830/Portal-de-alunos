import Link from "next/link";
import { notFound } from "next/navigation";

import { FlameIcon } from "@/components/icons/FlameIcon";
import { Avatar } from "@/components/shared/Avatar";
import { BackLink } from "@/components/shared/BackLink";
import { Stars } from "@/components/shared/Stars";
import { Card } from "@/components/ui/Card";
import { SegmentedProgressBar } from "@/components/ui/SegmentedProgressBar";
import { getStudentDetail } from "@/lib/professor/queries";
import { requireTeacher } from "@/lib/professor/guard";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - t) / 60_000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function ProfessorStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { supabase } = await requireTeacher();

  const detail = await getStudentDetail(supabase, studentId);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <BackLink href="/professor/alunos" label="Meus alunos" />
        <div className="flex items-center gap-4">
          <Avatar
            src={detail.avatarUrl}
            fullName={detail.fullName}
            email={detail.email}
            size="lg"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-fg-primary">
              {detail.fullName ?? detail.email}
            </h1>
            {detail.fullName && (
              <span className="text-sm text-fg-secondary">{detail.email}</span>
            )}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {detail.totalXp}
          </span>
          <span className="text-xs text-fg-secondary">XP total</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-2xl font-bold text-fg-primary">
            {detail.currentStreak}
            <FlameIcon className="h-5 w-5 text-warning" />
          </span>
          <span className="text-xs text-fg-secondary">Streak atual</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {detail.longestStreak}
          </span>
          <span className="text-xs text-fg-secondary">Maior streak</span>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Progresso por curso
        </h2>
        {detail.courses.length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">
              Este aluno ainda não está matriculado em nenhum curso.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {detail.courses.map((c) => (
              <li key={c.courseId}>
                <Link
                  href={`/cursos/${c.courseSlug}?from=admin`}
                  className="block"
                >
                  <Card
                    padded
                    interactive
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-fg-primary">
                        {c.courseTitle}
                      </span>
                      <span className="shrink-0 rounded-full border border-border-primary px-2.5 py-1 text-xs text-fg-secondary">
                        {c.language.toUpperCase()} ·{" "}
                        {c.level.toUpperCase()}
                      </span>
                    </div>
                    <SegmentedProgressBar
                      value={c.partsCompleted}
                      max={Math.max(c.totalParts, 1)}
                      ariaLabel={`Progresso em ${c.courseTitle}`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-fg-tertiary">
                      <span>
                        <span className="text-fg-primary">
                          {c.partsCompleted}
                        </span>
                        {" / "}
                        {c.totalParts} partes
                      </span>
                      {c.partsCompleted > 0 && (
                        <Stars value={Math.round(c.averageStars)} />
                      )}
                      <span>
                        Última atividade {formatRelative(c.lastActivity)}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
