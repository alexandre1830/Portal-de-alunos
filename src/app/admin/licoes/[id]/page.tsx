import Link from "next/link";
import { notFound } from "next/navigation";

import { AddPartDialog } from "@/components/admin/AddPartDialog";
import { EditLessonDialog } from "@/components/admin/EditLessonDialog";
import { EditPartDialog } from "@/components/admin/EditPartDialog";
import { ArrowDownIcon } from "@/components/icons/ArrowDownIcon";
import { ArrowUpIcon } from "@/components/icons/ArrowUpIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { BackLink } from "@/components/shared/BackLink";
import { ConfirmForm } from "@/components/shared/ConfirmForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deletePart, movePart } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) notFound();

  const { data: parts } = await supabase
    .from("parts")
    .select("*")
    .eq("lesson_id", id)
    .order("position");

  return (
    <div className="flex flex-col gap-8">
      <BackLink href={`/admin/cursos/${lesson.course_id}`} label="Curso" />

      {/* Header da lição: título display + status + pencil para editar */}
      <Card padded className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-xl font-semibold text-fg-primary">
            {lesson.title}
          </h1>
          <span
            className={
              lesson.is_published
                ? "self-start rounded-full bg-success-bg px-2.5 py-1 text-xs text-success"
                : "self-start rounded-full border border-border-primary px-2.5 py-1 text-xs text-fg-tertiary"
            }
          >
            {lesson.is_published ? "Publicada" : "Rascunho"}
          </span>
        </div>
        <EditLessonDialog
          lessonId={lesson.id}
          courseId={lesson.course_id}
          currentTitle={lesson.title}
          isPublished={lesson.is_published}
        />
      </Card>

      <Card padded className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-fg-primary">
          Importar PDF
        </h2>
        <p className="text-sm text-fg-secondary">
          Suba o PDF da lição e a Claude API gera um rascunho com partes e
          blocos. Você revisa antes de gravar.
        </p>
        <Link
          href={`/admin/licoes/${lesson.id}/importar`}
          className="self-start"
        >
          <Button type="button" variant="secondary" size="sm">
            Abrir importação
          </Button>
        </Link>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-fg-primary">Partes</h2>
          <AddPartDialog lessonId={lesson.id} courseId={lesson.course_id} />
        </div>

        {(parts ?? []).length === 0 && (
          <Card padded>
            <p className="text-sm text-fg-secondary">
              Esta lição ainda não tem partes.
            </p>
          </Card>
        )}

        {(parts ?? []).map((part) => (
          <Card key={part.id} padded className="flex items-center gap-2">
            <Link
              href={`/admin/partes/${part.id}`}
              className="flex flex-1 flex-col hover:underline"
            >
              <span className="font-medium text-fg-primary">{part.title}</span>
              {part.kind === "golden" && (
                <span className="text-xs text-warning">dourada</span>
              )}
            </Link>
            <EditPartDialog
              partId={part.id}
              lessonId={lesson.id}
              currentTitle={part.title}
              currentKind={part.kind}
            />
            <PartControls
              partId={part.id}
              lessonId={lesson.id}
              partTitle={part.title}
            />
          </Card>
        ))}
      </section>
    </div>
  );
}

function PartControls({
  partId,
  lessonId,
  partTitle,
}: {
  partId: string;
  lessonId: string;
  partTitle: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {(["up", "down"] as const).map((dir) => (
        <form key={dir} action={movePart}>
          <input type="hidden" name="id" value={partId} />
          <input type="hidden" name="lesson_id" value={lessonId} />
          <input type="hidden" name="dir" value={dir} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            aria-label={dir === "up" ? "Subir parte" : "Descer parte"}
            title={dir === "up" ? "Subir parte" : "Descer parte"}
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
        action={deletePart}
        title="Excluir parte"
        message={`Tem certeza que deseja excluir a parte "${partTitle}"? Todos os blocos dentro dela serão removidos. Esta ação não pode ser desfeita.`}
      >
        <input type="hidden" name="id" value={partId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          aria-label="Excluir parte"
          title="Excluir parte"
          className="text-danger hover:bg-danger-bg"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </ConfirmForm>
    </div>
  );
}
