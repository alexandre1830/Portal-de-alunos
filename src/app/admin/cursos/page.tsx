import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createCourse } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";

export default async function AdminCoursesPage() {
  const { supabase } = await requireAdmin();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, language, level, is_published")
    .order("created_at");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary">Cursos</h1>
        <p className="text-sm text-fg-secondary">
          Liste, crie e gerencie os cursos do portal.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {(courses ?? []).length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">Nenhum curso ainda.</p>
          </Card>
        ) : (
          (courses ?? []).map((course) => (
            <Link key={course.id} href={`/admin/cursos/${course.id}/modulos`}>
              <Card
                padded
                interactive
                className="flex items-center justify-between gap-4"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-fg-primary">{course.title}</span>
                  <span className="text-xs text-fg-tertiary">
                    {course.language.toUpperCase()} · {course.level.toUpperCase()} ·
                    /{course.slug}
                  </span>
                </div>
                <span
                  className={
                    course.is_published
                      ? "rounded-full bg-success-bg px-2.5 py-1 text-xs text-success"
                      : "rounded-full border border-border-primary px-2.5 py-1 text-xs text-fg-tertiary"
                  }
                >
                  {course.is_published ? "Publicado" : "Rascunho"}
                </span>
              </Card>
            </Link>
          ))
        )}
      </section>

      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Novo curso</h2>
        <form action={createCourse} className="flex flex-col gap-3">
          <input name="title" required placeholder="Título" className={inputCls} />
          <input name="slug" placeholder="slug (opcional)" className={inputCls} />
          <div className="flex gap-3">
            <select name="language" className={inputCls} defaultValue="en">
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
            </select>
            <select name="level" className={inputCls} defaultValue="a1">
              {["a1", "a2", "b1", "b2", "c1", "c2"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="self-start">
            Criar curso
          </Button>
        </form>
      </Card>
    </div>
  );
}
