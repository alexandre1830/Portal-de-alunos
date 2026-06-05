import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowDownIcon } from "@/components/icons/ArrowDownIcon";
import { ArrowUpIcon } from "@/components/icons/ArrowUpIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { BackLink } from "@/components/shared/BackLink";
import { ConfirmForm } from "@/components/shared/ConfirmForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  createPart,
  deletePart,
  movePart,
  updateLesson,
  updatePart,
} from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";

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

      <Card padded>
        <form action={updateLesson} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={lesson.id} />
          <input type="hidden" name="course_id" value={lesson.course_id} />
          <input name="title" defaultValue={lesson.title} className={inputCls} />
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input type="checkbox" name="is_published" defaultChecked={lesson.is_published} />
            Publicada
          </label>
          <Button type="submit" className="self-start">
            Salvar lição
          </Button>
        </form>
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
        <h2 className="text-base font-semibold text-fg-primary">Partes</h2>

        {(parts ?? []).map((part) => (
          <Card key={part.id} padded className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/partes/${part.id}`}
                className="flex-1 font-medium text-fg-primary hover:underline"
              >
                {part.title}
                {part.kind === "golden" && (
                  <span className="ml-2 text-xs text-warning">dourada</span>
                )}
              </Link>
              <PartControls
                partId={part.id}
                lessonId={lesson.id}
                partTitle={part.title}
              />
            </div>

            <form action={updatePart} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={part.id} />
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input name="title" defaultValue={part.title} className={`${inputCls} max-w-xs`} />
              <select name="kind" defaultValue={part.kind} className={`${inputCls} max-w-[10rem]`}>
                <option value="regular">Regular</option>
                <option value="golden">Dourada</option>
              </select>
              <Button type="submit" variant="secondary" size="sm">
                Salvar
              </Button>
            </form>
          </Card>
        ))}

        <Card padded>
          <form action={createPart} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="course_id" value={lesson.course_id} />
            <input name="title" placeholder="Nova parte" className={`${inputCls} max-w-xs`} />
            <select name="kind" defaultValue="regular" className={`${inputCls} max-w-[10rem]`}>
              <option value="regular">Regular</option>
              <option value="golden">Dourada</option>
            </select>
            <Button type="submit" variant="secondary" size="sm">
              Adicionar parte
            </Button>
          </form>
        </Card>
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
