import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminOverview } from "@/lib/admin/queries";

// Home do admin: 4 cards de visão geral em grid 2x2. Cada card é
// clicável e leva para a página correspondente.
export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const overview = await getAdminOverview(supabase);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Visão geral</h1>
      </div>

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

