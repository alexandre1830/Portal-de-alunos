"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { enrollStudent } from "@/lib/admin/actions";
import { initialEnrollState } from "@/lib/admin/types";

export function EnrollForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(
    enrollStudent,
    initialEnrollState,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <input type="hidden" name="course_id" value={courseId} />
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail do aluno"
          className="h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary"
        />
        <Button type="submit" variant="secondary" size="sm" loading={pending}>
          Matricular
        </Button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.notice && <p className="text-sm text-success">{state.notice}</p>}
    </form>
  );
}
