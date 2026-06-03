import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { Card } from "@/components/ui/Card";
import { Stars } from "@/components/shared/Stars";
import { getPartView } from "@/lib/courses/queries";
import { createClient } from "@/lib/supabase/server";

export default async function PartPage({
  params,
}: {
  params: Promise<{ partId: string }>;
}) {
  const { partId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const view = await getPartView(supabase, user.id, partId);
  if (!view) {
    notFound();
  }

  const { part, lesson, course, blocks, progress } = view;
  const done = progress?.status === "completed";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <Link
          href={course ? `/cursos/${course.slug}` : "/painel"}
          className="text-sm text-fg-secondary hover:text-fg-primary"
        >
          ← {course ? course.title : "Voltar"}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-fg-primary">
            {part.kind === "golden" && (
              <span aria-label="Parte dourada" title="Parte dourada">
                🏆
              </span>
            )}
            {part.title}
          </h1>
          {done && <Stars value={progress?.stars ?? 0} />}
        </div>
        {lesson && (
          <span className="text-sm text-fg-secondary">{lesson.title}</span>
        )}
      </div>

      {blocks.length === 0 ? (
        <Card padded>
          <p className="text-sm text-fg-secondary">
            Esta parte ainda não tem conteúdo.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {blocks.map((block) => (
            <Card key={block.id} padded>
              <BlockRenderer block={block} />
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
