import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { SegmentedProgressBar } from "@/components/ui/SegmentedProgressBar";
import { requireAdmin } from "@/lib/admin/guard";
import {
  getAdminOverview,
  getRecentlyActiveStudents,
  type AdminStudentRow,
} from "@/lib/admin/queries";

// Mesmo helper de tempo relativo que o painel do professor usa.
// Duplicado aqui pra evitar uma viagem ao /shared/utils só por isso.
function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - t) / 60_000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Home do admin: 4 cards de visão geral + lista dos alunos mais ativos
// recentemente (mesmo card do painel do professor). Cada card é clicável
// e leva à página correspondente.
export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const [overview, recentStudents] = await Promise.all([
    getAdminOverview(supabase),
    getRecentlyActiveStudents(supabase, 5),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Visão geral</h1>
      </div> */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatLink
          href="/admin/alunos"
          label="Alunos matriculados"
          value={overview.enrolledStudents}
          hint="Com matrícula ativa"
        />
        <StatLink
          href="/admin/alunos"
          label="Alunos ativos"
          value={overview.activeStudents}
          hint="Últimos 7 dias"
        />
        <StatLink
          href="/admin/professores"
          label="Professores"
          value={overview.teachers}
          hint={overview.teachers === 1 ? "Cadastrado" : "Cadastrados"}
        />
        <StatLink
          href="/admin/cursos"
          label="Cursos"
          value={overview.courses}
          hint={
            overview.publishedCourses === 1
              ? "1 publicado"
              : `${overview.publishedCourses} publicados`
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-fg-primary">
            Atividade recente
          </h2>
        </div>

        {recentStudents.length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">
              Nenhum aluno cadastrado ainda.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentStudents.map((s) => (
              <li key={s.userId}>
                <StudentRowCard student={s} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatLink({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Link href={href} className="block">
      <Card padded interactive className="flex h-full flex-col gap-2 p-8">
        <span className="text-4xl font-bold text-fg-primary">{value}</span>
        <span className="text-base font-medium text-fg-primary">{label}</span>
        <span className="text-sm text-fg-tertiary">{hint}</span>
      </Card>
    </Link>
  );
}

// Mesmo formato visual do card de aluno no painel do professor —
// /professor/alunos/page.tsx. Link vai pra detalhe administrativo
// (/admin/alunos/[id]).
function StudentRowCard({ student: s }: { student: AdminStudentRow }) {
  return (
    <Link href={`/admin/alunos/${s.userId}`} className="block">
      <Card
        padded
        interactive
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-col">
          <span className="font-medium text-fg-primary">
            {s.fullName ?? s.email}
          </span>
          {s.fullName && (
            <span className="text-xs text-fg-tertiary">{s.email}</span>
          )}
          <span className="mt-1 text-xs text-fg-tertiary">
            {s.enrolledCourses}{" "}
            {s.enrolledCourses === 1 ? "curso" : "cursos"} ·
            última atividade {formatRelative(s.lastActivity)}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="text-sm text-fg-secondary">
            <span className="text-fg-primary">{s.lessonsCompleted}</span> /{" "}
            {s.totalLessons || "—"} lições
          </span>
          {s.totalLessons > 0 && (
            <div className="w-40">
              <SegmentedProgressBar
                value={s.lessonsCompleted}
                max={s.totalLessons}
                ariaLabel="Progresso geral em lições"
              />
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
