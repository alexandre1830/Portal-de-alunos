"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { createAndEnrollStudent } from "@/lib/admin/actions";
import { initialCreateStudentState } from "@/lib/admin/types";

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";

export function CreateStudentForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(
    createAndEnrollStudent,
    initialCreateStudentState,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="course_id" value={courseId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="full_name"
          required
          placeholder="Nome completo"
          autoComplete="off"
          className={inputCls}
        />
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          autoComplete="off"
          className={inputCls}
        />
      </div>
      <input
        name="password"
        type="text"
        placeholder="Senha (opcional — geramos se vazio)"
        autoComplete="off"
        className={inputCls}
      />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        loading={pending}
        className="self-start"
      >
        Criar aluno e matricular
      </Button>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      {state.notice && (
        <div className="flex flex-col gap-2 rounded-md border border-border-primary bg-bg-secondary p-3 text-sm">
          <p className="font-medium text-success">{state.notice}</p>
          {state.credentials && (
            <>
              <div className="flex flex-col gap-1 text-fg-secondary">
                <span>
                  E-mail:{" "}
                  <code className="rounded bg-bg-tertiary px-1 py-0.5 text-fg-primary">
                    {state.credentials.email}
                  </code>
                </span>
                <span>
                  Senha:{" "}
                  <code className="rounded bg-bg-tertiary px-1 py-0.5 text-fg-primary">
                    {state.credentials.password}
                  </code>
                </span>
              </div>
              <p className="text-xs text-fg-tertiary">
                Anote agora — a senha não será exibida de novo. O aluno pode
                trocá-la depois.
              </p>
            </>
          )}
        </div>
      )}
    </form>
  );
}
