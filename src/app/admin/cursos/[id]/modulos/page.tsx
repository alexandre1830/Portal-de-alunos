import Link from "next/link";

import { ArrowDownIcon } from "@/components/icons/ArrowDownIcon";
import { ArrowUpIcon } from "@/components/icons/ArrowUpIcon";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { ConfirmForm } from "@/components/shared/ConfirmForm";
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
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label={dir === "up" ? "Subir módulo" : "Descer módulo"}
                    title={dir === "up" ? "Subir módulo" : "Descer módulo"}
                  >
                    {dir === "up" ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              ))}
              <ConfirmForm
                action={deleteModule}
                message={`Tem certeza que deseja excluir o módulo "${module.title}"? Todas as lições, partes e blocos dentro dele serão removidos. Esta ação não pode ser desfeita.`}
              >
                <input type="hidden" name="id" value={module.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  aria-label="Excluir módulo"
                  title="Excluir módulo"
                  className="text-danger hover:bg-danger-bg"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </ConfirmForm>
            </div>
          </div>

          <ul className="flex flex-col gap-2 pl-3">
            {(lessonsByModule.get(module.id) ?? []).map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center gap-1 rounded-md py-1"
              >
                <span className="flex-1 text-sm text-fg-primary">
                  {lesson.title}
                  {!lesson.is_published && (
                    <span className="ml-2 text-xs text-fg-tertiary">
                      (rascunho)
                    </span>
                  )}
                </span>
                <Link href={`/admin/licoes/${lesson.id}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Editar lição"
                    title="Editar lição"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                </Link>
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
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label={dir === "up" ? "Subir lição" : "Descer lição"}
                      title={dir === "up" ? "Subir lição" : "Descer lição"}
                    >
                      {dir === "up" ? (
                        <ArrowUpIcon className="h-4 w-4" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                ))}
                <ConfirmForm
                  action={deleteLesson}
                  message={`Tem certeza que deseja excluir a lição "${lesson.title}"? Todas as partes e blocos dentro dela serão removidos. Esta ação não pode ser desfeita.`}
                >
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label="Excluir lição"
                    title="Excluir lição"
                    className="text-danger hover:bg-danger-bg"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </ConfirmForm>
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
