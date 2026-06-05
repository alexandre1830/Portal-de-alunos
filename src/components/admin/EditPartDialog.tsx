"use client";

import { useState, useTransition } from "react";

import { PencilIcon } from "@/components/icons/PencilIcon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { updatePart } from "@/lib/admin/actions";

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-fg-tertiary";

// Dialog para renomear/mudar o tipo de uma parte.
export function EditPartDialog({
  partId,
  lessonId,
  currentTitle,
  currentKind,
}: {
  partId: string;
  lessonId: string;
  currentTitle: string;
  currentKind: "regular" | "golden";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      await updatePart(formData);
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
        aria-label="Editar parte"
        title="Editar parte"
      >
        <PencilIcon className="h-4 w-4" />
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Editar parte"
      >
        <form action={handleAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={partId} />
          <input type="hidden" name="lesson_id" value={lessonId} />
          <input
            name="title"
            defaultValue={currentTitle}
            required
            autoFocus
            className={inputCls}
          />
          <select name="kind" defaultValue={currentKind} className={inputCls}>
            <option value="regular">Regular</option>
            <option value="golden">Dourada</option>
          </select>
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
