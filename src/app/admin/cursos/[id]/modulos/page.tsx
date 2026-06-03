import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  duplicateLesson,
  moveLesson,
  moveModule,
  updateModule,
} from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";

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
        <Card key={module.id} padded className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <form action={updateModule} className="flex flex-1 items-end gap-2">
              <input type="hidden" name="id" value={module.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <input
                name="title"
                defaultValue={module.title}
                className={inputCls}
              />
              <Button type="submit" variant="secondary" size="sm">
                Salvar
              </Button>
            </form>
            <div className="flex items-center gap-1">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveModule}>
                  <input type="hidden" name="id" value={module.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <input type="hidden" name="dir" value={dir} />
                  <Button type="submit" variant="ghost" size="sm">
                    {dir === "up" ? "Subir" : "Descer"}
                  </Button>
                </form>
              ))}
              <form action={deleteModule}>
                <input type="hidden" name="id" value={module.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <Button type="submit" variant="ghost" size="sm">
                  Excluir
                </Button>
              </form>
            </div>
          </div>

          <ul className="flex flex-col gap-2 pl-3">
            {(lessonsByModule.get(module.id) ?? []).map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center gap-2 rounded-md py-1"
              >
                <div className="flex flex-1 flex-col">
                  <span className="text-sm text-fg-primary">
                    {lesson.title}
                    {!lesson.is_published && (
                      <span className="ml-2 text-xs text-fg-tertiary">
                        (rascunho)
                      </span>
                    )}
                  </span>
                  <Link
                    href={`/admin/licoes/${lesson.id}`}
                    className="text-xs font-medium text-fg-secondary hover:text-fg-primary"
                  >
                    Editar lição →
                  </Link>
                </div>
                <form action={duplicateLesson}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <Button type="submit" variant="ghost" size="sm">
                    Duplicar
                  </Button>
                </form>
                {(["up", "down"] as const).map((dir) => (
                  <form key={dir} action={moveLesson}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <input type="hidden" name="module_id" value={module.id} />
                    <input type="hidden" name="course_id" value={courseId} />
                    <input type="hidden" name="dir" value={dir} />
                    <Button type="submit" variant="ghost" size="sm">
                      {dir === "up" ? "Subir" : "Descer"}
                    </Button>
                  </form>
                ))}
                <form action={deleteLesson}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <Button type="submit" variant="ghost" size="sm">
                    Excluir
                  </Button>
                </form>
              </li>
            ))}
          </ul>

          <form
            action={createLesson}
            className="flex flex-wrap items-end gap-2 pl-3"
          >
            <input type="hidden" name="module_id" value={module.id} />
            <input type="hidden" name="course_id" value={courseId} />
            <input name="title" placeholder="Nova lição" className={inputCls} />
            <Button type="submit" variant="secondary" size="sm">
              Adicionar lição
            </Button>
            <p className="basis-full pl-1 text-xs text-fg-tertiary">
              Já vem com 8 partes: Abertura, Vocabulary, Lesson topic, Grammar,
              Pronunciation, Dialogue, Exercises, Revisão (dourada).
            </p>
          </form>
        </Card>
      ))}

      <Card padded>
        <form action={createModule} className="flex items-end gap-2">
          <input type="hidden" name="course_id" value={courseId} />
          <input name="title" placeholder="Novo módulo" className={inputCls} />
          <Button type="submit" variant="secondary" size="sm">
            Adicionar módulo
          </Button>
        </form>
      </Card>
    </section>
  );
}
