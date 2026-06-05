import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BookmarkIcon } from "@/components/icons/BookmarkIcon";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { PartStepper } from "@/components/partes/PartStepper";
import { BackLink } from "@/components/shared/BackLink";
import { Stars } from "@/components/shared/Stars";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toggleReviewMark } from "@/lib/review/actions";
import { getPartView } from "@/lib/courses/queries";
import {
  getUserPreferences,
  voiceForLang,
} from "@/lib/preferences/queries";
import { createClient } from "@/lib/supabase/server";

export default async function PartPage({
  params,
  searchParams,
}: {
  params: Promise<{ partId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { partId } = await params;
  const sp = await searchParams;
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

  const { part, lesson, course, blocks, progress, marked } = view;
  const done = progress?.status === "completed";

  // Pré-visualização vinda do admin: só faz sentido para quem realmente
  // é admin. Para qualquer outro role, ignoramos o ?from=admin.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminPreview =
    sp.from === "admin" && profile?.role === "admin";

  const prefs = await getUserPreferences(supabase, user.id);
  const lang = course?.language === "es" ? "es" : "en";
  const tts = {
    lang: lang as "en" | "es",
    voice: voiceForLang(prefs, lang),
    rate: prefs.ttsRate,
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      {/* Banner de "modo pré-visualização" — só admin vê. Em preview, o
          único caminho de volta é por aqui, e nada do que o admin fizer
          afeta XP/progresso/SRS (o servidor faz dry-run). */}
      {isAdminPreview && (
        <Card
          padded
          className="flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning-bg"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-fg-primary">
              Você está vendo como aluno
            </span>
            <span className="text-xs text-fg-secondary">
              Suas ações aqui não contam — nada de XP, progresso, conquistas
              ou itens de revisão são gravados.
            </span>
          </div>
          <Link href={`/admin/partes/${part.id}`}>
            <Button type="button" variant="secondary" size="sm">
              <PencilIcon className="h-4 w-4" />
              Voltar para edição
            </Button>
          </Link>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {/* BackLink só aparece no modo aluno — em preview, o admin volta
            pelo banner amarelo (caminho único de saída). */}
        {!isAdminPreview && (
          <BackLink
            href={course ? `/cursos/${course.slug}` : "/painel"}
            label={course ? course.title : "Voltar"}
          />
        )}
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-fg-primary">
            {part.kind === "golden" && (
              <TrophyIcon className="h-6 w-6 text-warning" />
            )}
            {part.title}
          </h1>
          <div className="flex items-center gap-3">
            {done && !isAdminPreview && (
              <Stars value={progress?.stars ?? 0} />
            )}
            {/* Bookmark "para revisar" também é exclusivo do aluno — o admin
                em preview não precisa marcar para revisar. */}
            {course && !isAdminPreview && (
              <form action={toggleReviewMark}>
                <input type="hidden" name="part_id" value={part.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  aria-label={
                    marked
                      ? "Remover marcação para revisar"
                      : "Marcar para revisar depois"
                  }
                  title={
                    marked
                      ? "Marcada para revisar — clique para remover"
                      : "Marcar para revisar depois"
                  }
                >
                  <BookmarkIcon
                    filled={marked}
                    className={
                      marked ? "h-5 w-5 text-warning" : "h-5 w-5"
                    }
                  />
                </Button>
              </form>
            )}
          </div>
        </div>
        {lesson && (
          <span className="text-sm text-fg-secondary">{lesson.title}</span>
        )}
      </div>

      <PartStepper
        partId={part.id}
        blocks={blocks}
        tts={tts}
        initiallyCompleted={done && !isAdminPreview}
        previewMode={isAdminPreview}
        // courseHref só faz sentido para o aluno; em preview o caminho de
        // volta é o botão "Voltar para edição" do banner.
        courseHref={
          isAdminPreview
            ? undefined
            : course
              ? `/cursos/${course.slug}`
              : undefined
        }
      />
    </main>
  );
}
