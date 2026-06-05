"use client";

import { useState, useTransition } from "react";

import { PencilIcon } from "@/components/icons/PencilIcon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { updateModule } from "@/lib/admin/actions";

// Botão pencil que abre um Dialog com o nome atual do módulo para edição.
// Usa a Server Action updateModule existente.
export function EditModuleDialog({
  moduleId,
  courseId,
  currentTitle,
}: {
  moduleId: string;
  courseId: string;
  currentTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      await updateModule(formData);
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
        aria-label="Editar nome do módulo"
        title="Editar nome do módulo"
      >
        <PencilIcon className="h-4 w-4" />
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Renomear módulo"
      >
        <form action={handleAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={moduleId} />
          <input type="hidden" name="course_id" value={courseId} />
          <input
            name="title"
            defaultValue={currentTitle}
            required
            autoFocus
            className="h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-fg-tertiary"
          />
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
