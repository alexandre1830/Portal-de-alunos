import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  createLesson,
  createModule,
  deleteCourse,
  deleteLesson,
  deleteModule,
  moveLesson,
  moveModule,
  updateCourse,
  updateModule,
} from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";

export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();

  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", id).order("position"),
    supabase.from("lessons").select("*").eq("course_id", id).order("position"),
  ]);

  const lessonsByModule = new Map<string, typeof lessons>();
  for (const lesson of lessons ?? []) {
    const arr = lessonsByModule.get(lesson.module_id) ?? [];
    arr.push(lesson);
    lessonsByModule.set(lesson.module_id, arr);
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin" className="text-sm text-fg-secondary hover:text-fg-primary">
        ← Cursos
      </Link>

      {/* Metadados */}
      <Card padded>
        <form action={updateCourse} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={course.id} />
          <input name="title" defaultValue={course.title} className={inputCls} placeholder="Título" />
          <input name="slug" defaultValue={course.slug} className={inputCls} placeholder="slug" />
          <textarea
            name="description"
            defaultValue={course.description ?? ""}
            className={`${inputCls} h-20 py-2`}
            placeholder="Descrição"
          />
          <div className="flex gap-3">
            <select name="language" defaultValue={course.language} className={inputCls}>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
            </select>
            <select name="level" defaultValue={course.level} className={inputCls}>
              {["a1", "a2", "b1", "b2", "c1", "c2"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input type="checkbox" name="is_published" defaultChecked={course.is_published} />
            Publicado
          </label>
          <div className="flex items-center justify-between">
            <Button type="submit">Salvar curso</Button>
          </div>
        </form>
      </Card>

      {/* Módulos */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-fg-primary">Módulos</h2>

        {(modules ?? []).map((module) => (
          <Card key={module.id} padded className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <form action={updateModule} className="flex flex-1 items-end gap-2">
                <input type="hidden" name="id" value={module.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <input name="title" defaultValue={module.title} className={inputCls} />
                <Button type="submit" variant="secondary" size="sm">
                  Salvar
                </Button>
              </form>
              <ReorderDelete
                action={moveModule}
                deleteAction={deleteModule}
                hidden={{ id: module.id, course_id: course.id }}
              />
            </div>

            <ul className="flex flex-col gap-2 pl-3">
              {(lessonsByModule.get(module.id) ?? []).map((lesson) => (
                <li key={lesson.id} className="flex items-center gap-2">
                  <Link
                    href={`/admin/licoes/${lesson.id}`}
                    className="flex-1 text-sm text-fg-primary hover:underline"
                  >
                    {lesson.title}
                    {!lesson.is_published && (
                      <span className="ml-2 text-xs text-fg-tertiary">(rascunho)</span>
                    )}
                  </Link>
                  <form action={moveLesson}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <input type="hidden" name="module_id" value={module.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <input type="hidden" name="dir" value="up" />
                    <Button type="submit" variant="ghost" size="sm">
                      Subir
                    </Button>
                  </form>
                  <form action={moveLesson}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <input type="hidden" name="module_id" value={module.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <input type="hidden" name="dir" value="down" />
                    <Button type="submit" variant="ghost" size="sm">
                      Descer
                    </Button>
                  </form>
                  <form action={deleteLesson}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Excluir
                    </Button>
                  </form>
                </li>
              ))}
            </ul>

            <form action={createLesson} className="flex items-end gap-2 pl-3">
              <input type="hidden" name="module_id" value={module.id} />
              <input type="hidden" name="course_id" value={course.id} />
              <input name="title" placeholder="Nova lição" className={inputCls} />
              <Button type="submit" variant="secondary" size="sm">
                Adicionar lição
              </Button>
            </form>
          </Card>
        ))}

        <Card padded>
          <form action={createModule} className="flex items-end gap-2">
            <input type="hidden" name="course_id" value={course.id} />
            <input name="title" placeholder="Novo módulo" className={inputCls} />
            <Button type="submit" variant="secondary" size="sm">
              Adicionar módulo
            </Button>
          </form>
        </Card>
      </section>

      <form action={deleteCourse}>
        <input type="hidden" name="id" value={course.id} />
        <Button type="submit" variant="danger" size="sm">
          Excluir curso
        </Button>
      </form>
    </div>
  );
}

// Botões de reordenar + excluir para módulos.
function ReorderDelete({
  action,
  deleteAction,
  hidden,
}: {
  action: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  hidden: Record<string, string>;
}) {
  const fields = Object.entries(hidden).map(([k, v]) => (
    <input key={k} type="hidden" name={k} value={v} />
  ));
  return (
    <div className="flex items-center gap-1">
      <form action={action}>
        {fields}
        <input type="hidden" name="dir" value="up" />
        <Button type="submit" variant="ghost" size="sm">
          Subir
        </Button>
      </form>
      <form action={action}>
        {fields}
        <input type="hidden" name="dir" value="down" />
        <Button type="submit" variant="ghost" size="sm">
          Descer
        </Button>
      </form>
      <form action={deleteAction}>
        {fields}
        <Button type="submit" variant="ghost" size="sm">
          Excluir
        </Button>
      </form>
    </div>
  );
}
