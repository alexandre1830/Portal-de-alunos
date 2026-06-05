import { AddLessonDialog } from "@/components/admin/AddLessonDialog";
import { AddModuleDialog } from "@/components/admin/AddModuleDialog";
import { LessonRowMenu } from "@/components/admin/LessonRowMenu";
import { ModuleRowMenu } from "@/components/admin/ModuleRowMenu";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminCourseModulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, position")
      .eq("course_id", courseId)
      .order("position"),
    supabase
      .from("lessons")
      .select("id, module_id, title, position, is_published")
      .eq("course_id", courseId)
      .order("position"),
  ]);

  const lessonsByModule = new Map<string, typeof lessons>();
  for (const lesson of lessons ?? []) {
    const arr = lessonsByModule.get(lesson.module_id) ?? [];
    arr.push(lesson);
    lessonsByModule.set(lesson.module_id, arr);
  }

  return (
    <section className="flex flex-col gap-4">
      {(modules ?? []).map((module) => (
        <Card key={module.id} padded className="flex flex-col gap-0 p-0">
          {/* Header do módulo: título + menu de 3 pontinhos. */}
          <div className="flex items-center gap-2 border-b border-border-primary px-5 py-4">
            <h3 className="flex-1 truncate text-base font-semibold text-fg-primary">
              {module.title}
            </h3>
            <ModuleRowMenu
              moduleId={module.id}
              courseId={courseId}
              moduleTitle={module.title}
            />
          </div>

          {/* Lista de lições — título + menu de 3 pontinhos por linha. */}
          <ul className="flex flex-col divide-y divide-border-primary bg-bg-primary/40">
            {(lessonsByModule.get(module.id) ?? []).map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center gap-2 px-5 py-2"
              >
                <span className="flex-1 truncate text-sm text-fg-primary">
                  {lesson.title}
                  {!lesson.is_published && (
                    <span className="ml-2 text-xs text-fg-tertiary">
                      (rascunho)
                    </span>
                  )}
                </span>
                <LessonRowMenu
                  lessonId={lesson.id}
                  moduleId={module.id}
                  courseId={courseId}
                  lessonTitle={lesson.title}
                />
              </li>
            ))}
          </ul>

          {/* Rodapé do card: adicionar nova lição (abre Dialog). */}
          <div className="flex items-center justify-end border-t border-border-primary px-5 py-3">
            <AddLessonDialog moduleId={module.id} courseId={courseId} />
          </div>
        </Card>
      ))}

      <div className="flex justify-end">
        <AddModuleDialog courseId={courseId} />
      </div>
    </section>
  );
}
