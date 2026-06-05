import Link from "next/link";

import { EnrollForm } from "@/components/admin/EnrollForm";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { ConfirmForm } from "@/components/shared/ConfirmForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { unenrollStudent } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminCourseEnrollmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const { supabase } = await requireAdmin();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, status, user:profiles(email, full_name)")
    .eq("course_id", courseId)
    .order("created_at");

  return (
    <section className="flex flex-col gap-4">
      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Alunos matriculados
        </h2>
        {(enrollments ?? []).length === 0 ? (
          <p className="text-sm text-fg-secondary">
            Nenhum aluno matriculado ainda.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-primary">
            {(enrollments ?? []).map((enr) => (
              <li
                key={enr.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="text-sm text-fg-primary">
                  {enr.user?.email ?? "—"}
                  {enr.user?.full_name && (
                    <span className="ml-2 text-xs text-fg-tertiary">
                      {enr.user.full_name}
                    </span>
                  )}
                </span>
                <ConfirmForm
                  action={unenrollStudent}
                  title="Remover matrícula"
                  message={`Tem certeza que deseja remover ${enr.user?.email ?? "este aluno"} do curso? O histórico de XP e progresso é preservado, mas o aluno perde o acesso ao conteúdo.`}
                  confirmLabel="Remover"
                >
                  <input type="hidden" name="id" value={enr.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label="Remover matrícula"
                    title="Remover matrícula"
                    className="text-danger hover:bg-danger-bg"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </ConfirmForm>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padded className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-fg-primary">
          Matricular aluno
        </h2>
        <EnrollForm courseId={courseId} />
        <p className="text-xs text-fg-tertiary">
          O aluno precisa já ter conta no portal. Se não tem,{" "}
          <Link
            href="/admin/alunos"
            className="font-medium text-fg-secondary underline hover:text-fg-primary"
          >
            crie a conta em Alunos
          </Link>{" "}
          e volte aqui para matricular.
        </p>
      </Card>
    </section>
  );
}
