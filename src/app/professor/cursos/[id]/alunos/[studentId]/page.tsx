import Link from "next/link";
import { notFound } from "next/navigation";

import { Stars } from "@/components/shared/Stars";
import { Card } from "@/components/ui/Card";
import { requireTeacher } from "@/lib/professor/guard";
import type { Lesson, Module, Part, PartProgress } from "@/types/content";

const PROGRESS_LABEL: Record<string, string> = {
  in_progress: "Em andamento",
  completed: "Concluída",
};

export default async function ProfessorStudentPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id: courseId, studentId } = await params;
  const { supabase } = await requireTeacher();

  const [
    { data: course },
    { data: student },
    { data: modules },
    { data: lessons },
    { data: parts },
    { data: progressRows },
    { data: gamification },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, slug")
      .eq("id", courseId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("position"),
    supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("position"),
    supabase
      .from("parts")
      .select("*")
      .eq("course_id", courseId)
      .order("position"),
    supabase
      .from("part_progress")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", studentId),
    supabase
      .from("user_gamification")
      .select("total_xp, current_streak, longest_streak")
      .eq("user_id", studentId)
      .maybeSingle(),
  ]);

  if (!course || !student) notFound();

  const progressByPart = new Map(
    (progressRows ?? []).map((p: PartProgress) => [p.part_id, p]),
  );
  const partsByLesson = new Map<string, Part[]>();
  for (const p of parts ?? []) {
    const arr = partsByLesson.get(p.lesson_id) ?? [];
    arr.push(p);
    partsByLesson.set(p.lesson_id, arr);
  }
  const lessonsByModule = new Map<string, Lesson[]>();
  for (const l of lessons ?? []) {
    const arr = lessonsByModule.get(l.module_id) ?? [];
    arr.push(l);
    lessonsByModule.set(l.module_id, arr);
  }

  const totalParts = parts?.length ?? 0;
  const completedParts = (progressRows ?? []).filter(
    (p) => p.status === "completed",
  ).length;
  const firstTryStars = (progressRows ?? [])
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.stars ?? 0), 0);
  const avgStars =
    completedParts > 0 ? firstTryStars / completedParts : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/professor/cursos/${course.id}`}
          className="text-sm text-fg-secondary hover:text-fg-primary"
        >
          ← {course.title}
        </Link>
        <h1 className="text-2xl font-semibold text-fg-primary">
          {student.full_name ?? student.email}
        </h1>
        {student.full_name && (
          <span className="text-sm text-fg-tertiary">{student.email}</span>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {completedParts}
            <span className="text-base text-fg-secondary"> / {totalParts}</span>
          </span>
          <span className="text-xs text-fg-secondary">Partes concluídas</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-2xl font-bold text-fg-primary">
            {avgStars.toFixed(1)}
            <Stars value={Math.round(avgStars)} className="text-base" />
          </span>
          <span className="text-xs text-fg-secondary">Estrelas (média)</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {gamification?.total_xp ?? 0}
          </span>
          <span className="text-xs text-fg-secondary">XP total (global)</span>
        </Card>
        <Card padded className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-fg-primary">
            {gamification?.current_streak ?? 0}
          </span>
          <span className="text-xs text-fg-secondary">Streak atual</span>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-fg-primary">
          Progresso por lição
        </h2>

        {(modules ?? []).map((module: Module) => (
          <Card key={module.id} padded className="flex flex-col gap-3">
            <h3 className="font-medium text-fg-primary">{module.title}</h3>

            {(lessonsByModule.get(module.id) ?? []).map((lesson) => (
              <div key={lesson.id} className="flex flex-col gap-2 pl-3">
                <span className="text-sm font-medium text-fg-primary">
                  {lesson.title}
                  {!lesson.is_published && (
                    <span className="ml-2 text-xs text-fg-tertiary">
                      (rascunho)
                    </span>
                  )}
                </span>
                <ul className="flex flex-col">
                  {(partsByLesson.get(lesson.id) ?? []).map((part) => {
                    const progress = progressByPart.get(part.id);
                    const status = progress?.status;
                    return (
                      <li
                        key={part.id}
                        className="flex items-center justify-between gap-3 py-1 text-sm"
                      >
                        <span className="text-fg-secondary">{part.title}</span>
                        <span className="flex items-center gap-3 text-xs">
                          {status === "completed" ? (
                            <>
                              <Stars value={progress?.stars ?? 0} />
                              {typeof progress?.score === "number" && (
                                <span className="text-fg-tertiary">
                                  {progress.score}%
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-fg-tertiary">
                              {status
                                ? PROGRESS_LABEL[status]
                                : "Não iniciada"}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </Card>
        ))}
      </section>
    </div>
  );
}
