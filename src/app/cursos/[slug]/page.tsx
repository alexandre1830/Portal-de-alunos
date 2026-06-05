import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { BackLink } from "@/components/shared/BackLink";
import { Stars } from "@/components/shared/Stars";
import { Card } from "@/components/ui/Card";
import { getCourseStructure } from "@/lib/courses/queries";
import { createClient } from "@/lib/supabase/server";
import type { CourseLanguage } from "@/types/content";

const LANGUAGE_LABELS: Record<CourseLanguage, string> = {
  en: "Inglês",
  es: "Espanhol",
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const structure = await getCourseStructure(supabase, user.id, slug);
  if (!structure) {
    notFound();
  }

  const { course, modules } = structure;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <BackLink href="/painel" label="Voltar ao painel" />
        <h1 className="text-2xl font-semibold text-fg-primary">
          {course.title}
        </h1>
        <span className="text-sm text-fg-secondary">
          {LANGUAGE_LABELS[course.language]} · {course.level.toUpperCase()}
        </span>
        {course.description && (
          <p className="text-sm text-fg-secondary">{course.description}</p>
        )}
      </div>

      {modules.length === 0 ? (
        <Card padded>
          <p className="text-sm text-fg-secondary">
            Este curso ainda não tem conteúdo publicado.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {modules.map((module) => (
            <section key={module.id} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-fg-primary">
                {module.title}
              </h2>

              {module.lessons.length === 0 ? (
                <p className="text-sm text-fg-tertiary">
                  Nenhuma lição publicada neste módulo.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {module.lessons.map((lesson, i) => (
                    <Card
                      key={lesson.id}
                      padded
                      className="flex flex-col gap-3 animate-fade-slide-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <h3 className="font-medium text-fg-primary">
                        {lesson.title}
                      </h3>

                      {lesson.parts.length === 0 ? (
                        <p className="text-sm text-fg-tertiary">
                          Sem partes ainda.
                        </p>
                      ) : (
                        <ul className="flex flex-col">
                          {lesson.parts.map((part) => {
                            const done = part.progress?.status === "completed";
                            return (
                              <li key={part.id}>
                                <Link
                                  href={`/partes/${part.id}`}
                                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-bg-secondary"
                                >
                                  <span className="flex items-center gap-2 text-sm text-fg-primary">
                                    {part.kind === "golden" && (
                                      <TrophyIcon
                                        className="h-4 w-4 text-warning"
                                      />
                                    )}
                                    {part.title}
                                  </span>
                                  {done ? (
                                    <Stars value={part.progress?.stars ?? 0} />
                                  ) : (
                                    <span className="text-xs text-fg-tertiary">
                                      {part.progress ? "Em andamento" : "Não iniciada"}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
