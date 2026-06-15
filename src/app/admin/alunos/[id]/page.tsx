import { notFound } from "next/navigation";

import { AddLiveSessionButton } from "@/components/admin/AddLiveSessionButton";
import { EditableUserNameHeader } from "@/components/admin/EditableUserNameHeader";
import { LiveSessionRowMenu } from "@/components/admin/LiveSessionRowMenu";
import { Avatar } from "@/components/shared/Avatar";
import { BackLink } from "@/components/shared/BackLink";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";
import {
  DAY_LABELS,
  formatStartTime,
  listStudentLiveSessions,
} from "@/lib/live-sessions/queries";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("id", id)
    .maybeSingle();
  if (!student || student.role !== "student") notFound();

  // Professores VINCULADOS a este aluno — única fonte permitida de
  // teacher_id no LiveSessionDialog (o FK composto exige).
  const { data: links } = await supabase
    .from("teacher_students")
    .select(
      "teacher_id, teacher:profiles!teacher_students_teacher_id_fkey(id, full_name, email)",
    )
    .eq("student_id", id);
  const teachers = (links ?? [])
    .map((l) => l.teacher)
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .map((t) => ({ id: t.id, fullName: t.full_name, email: t.email }));

  const sessions = await listStudentLiveSessions(supabase, id);

  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/admin/alunos" label="Alunos" />

      <Card padded className="flex items-center gap-4">
        <Avatar
          src={student.avatar_url}
          fullName={student.full_name}
          email={student.email}
          size="lg"
        />
        <div className="flex flex-col">
          <EditableUserNameHeader
            id={student.id}
            fullName={student.full_name ?? ""}
            email={student.email}
            role="student"
          />
          <span className="text-sm text-fg-tertiary">{student.email}</span>
        </div>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-fg-primary">
              Aulas síncronas
            </h2>
            <p className="text-xs text-fg-tertiary">
              Horários recorrentes com link de acesso.
            </p>
          </div>
          <AddLiveSessionButton studentId={id} teachers={teachers} />
        </div>

        {sessions.length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">
              {teachers.length === 0
                ? "Vincule um professor ao aluno em Professores antes de cadastrar aulas."
                : "Nenhuma aula cadastrada. Use o botão acima."}
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col divide-y divide-border-primary rounded-md border border-border-primary [&>li:first-child]:rounded-t-md [&>li:last-child]:rounded-b-md">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 bg-bg-primary px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-fg-primary">
                    {DAY_LABELS[s.dayOfWeek]} · {formatStartTime(s.startTime)}
                  </span>
                  <span className="text-xs text-fg-tertiary">
                    Professor: {s.teacherName ?? "—"}
                  </span>
                  <a
                    href={s.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-brand hover:underline truncate max-w-md"
                  >
                    {s.meetUrl}
                  </a>
                </div>
                <LiveSessionRowMenu
                  studentId={id}
                  teachers={teachers}
                  session={{
                    id: s.id,
                    teacherId: s.teacherId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    meetUrl: s.meetUrl,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
