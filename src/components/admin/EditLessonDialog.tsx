"use client";

import { useState, useTransition } from "react";

import { PencilIcon } from "@/components/icons/PencilIcon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { updateLesson } from "@/lib/admin/actions";

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-fg-tertiary";

// Dialog para renomear a lição e alterar o status de publicação.
export function EditLessonDialog({
  lessonId,
  courseId,
  currentTitle,
  isPublished,
}: {
  lessonId: string;
  courseId: string;
  currentTitle: string;
  isPublished: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      await updateLesson(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Editar lição"
        title="Editar lição"
      >
        <PencilIcon className="h-4 w-4" />
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Editar lição"
      >
        <form action={handleAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={lessonId} />
          <input type="hidden" name="course_id" value={courseId} />
          <input
            name="title"
            defaultValue={currentTitle}
            required
            autoFocus
            className={inputCls}
          />
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={isPublished}
            />
            Publicada
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={pending}>
              Salvar
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
