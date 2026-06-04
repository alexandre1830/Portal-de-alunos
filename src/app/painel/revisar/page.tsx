import Link from "next/link";
import { redirect } from "next/navigation";

import { BookmarkIcon } from "@/components/icons/BookmarkIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toggleReviewMark } from "@/lib/review/actions";
import { createClient } from "@/lib/supabase/server";

export default async function RevisarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS já filtra para o usuário; trazemos parte + lição + curso aninhados.
  const { data: marks } = await supabase
    .from("review_marks")
    .select(
      "id, created_at, part:parts(id, title, kind, lesson:lessons(title)), course:courses(id, slug, title)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (marks ?? []).filter((m) => m.part && m.course);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <Link
          href="/painel"
          className="text-sm text-fg-secondary hover:text-fg-primary"
        >
          ← Voltar ao painel
        </Link>
        <h1 className="text-2xl font-semibold text-fg-primary">
          Para revisar
        </h1>
        <p className="text-sm text-fg-secondary">
          Suas marcações de partes que você quer revisitar depois.
        </p>
      </div>

      {items.length === 0 ? (
        <Card padded>
          <p className="text-sm text-fg-secondary">
            Você ainda não marcou nenhuma parte. Dentro de uma parte, use o
            botão de marcador para guardá-la aqui.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((mark) => {
            const part = mark.part!;
            const course = mark.course!;
            const lessonTitle = part.lesson?.title;
            return (
              <li key={mark.id}>
                <Card
                  padded
                  className="flex items-center justify-between gap-4"
                >
                  <Link
                    href={`/partes/${part.id}`}
                    className="flex min-w-0 flex-1 flex-col"
                  >
                    <span className="truncate font-medium text-fg-primary">
                      {part.title}
                    </span>
                    <span className="truncate text-xs text-fg-tertiary">
                      {course.title}
                      {lessonTitle ? ` · ${lessonTitle}` : ""}
                    </span>
                  </Link>
                  <form action={toggleReviewMark}>
                    <input type="hidden" name="part_id" value={part.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label="Remover marcação"
                      title="Remover marcação"
                    >
                      <BookmarkIcon filled className="h-4 w-4 text-warning" />
                    </Button>
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
