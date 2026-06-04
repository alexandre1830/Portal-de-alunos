import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { requireTeacher } from "@/lib/professor/guard";

export default async function ProfessorCoursesPage() {
  const { supabase, userId } = await requireTeacher();

  // Mostra apenas os cursos onde o usuário é o professor responsável. Admin
  // sem cursos próprios vê o estado vazio — para ver tudo, vá ao /admin.
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, language, level, is_published")
    .eq("teacher_id", userId)
    .order("created_at");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary">Meus cursos</h1>
        <p className="text-sm text-fg-secondary">
          Acompanhe os alunos e o progresso de cada curso sob sua
          responsabilidade.
        </p>
      </div>

      {(courses ?? []).length === 0 ? (
        <Card padded>
          <p className="text-sm text-fg-secondary">
            Você ainda não está vinculado a nenhum curso. Peça ao admin para
            atribuir você na aba <strong>Config</strong> do curso.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {(courses ?? []).map((course) => (
            <li key={course.id}>
              <Link href={`/professor/cursos/${course.id}`}>
                <Card
                  padded
                  interactive
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-fg-primary">
                      {course.title}
                    </span>
                    <span className="text-xs text-fg-tertiary">
                      {course.language.toUpperCase()} ·{" "}
                      {course.level.toUpperCase()}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
