import { notFound, redirect } from "next/navigation";

import { BookmarkIcon } from "@/components/icons/BookmarkIcon";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { PartStepper } from "@/components/partes/PartStepper";
import { BackLink } from "@/components/shared/BackLink";
import { Stars } from "@/components/shared/Stars";
import { Button } from "@/components/ui/Button";
import { toggleReviewMark } from "@/lib/review/actions";
import { getPartView } from "@/lib/courses/queries";
import {
  getUserPreferences,
  voiceForLang,
} from "@/lib/preferences/queries";
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

  const { part, lesson, course, blocks, progress, marked } = view;
  const done = progress?.status === "completed";

  const prefs = await getUserPreferences(supabase, user.id);
  const lang = course?.language === "es" ? "es" : "en";
  const tts = {
    lang: lang as "en" | "es",
    voice: voiceForLang(prefs, lang),
    rate: prefs.ttsRate,
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <BackLink
          href={course ? `/cursos/${course.slug}` : "/painel"}
          label={course ? course.title : "Voltar"}
        />
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-fg-primary">
            {part.kind === "golden" && (
              <TrophyIcon className="h-6 w-6 text-warning" />
            )}
            {part.title}
          </h1>
          <div className="flex items-center gap-3">
            {done && <Stars value={progress?.stars ?? 0} />}
            {course && (
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
        initiallyCompleted={done}
      />
    </main>
  );
}
