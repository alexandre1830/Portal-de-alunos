import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminOverview } from "@/lib/admin/queries";

// Home do admin: 4 cards de visão geral. Cada card é clicável quando
// faz sentido (alunos → /admin/alunos; cursos → /admin/cursos). Os
// que ainda não têm página dedicada (professores) ficam como cards
// informativos sem link.
export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const overview = await getAdminOverview(supabase);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Visão geral</h1>
        <p className="text-sm text-fg-secondary">
          Os números do portal num relance. Clique nos cards para ir ao
          detalhamento.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <Card padded interactive className="flex h-full flex-col gap-1">
        <span className="text-2xl font-bold text-fg-primary">{value}</span>
        <span className="text-xs font-medium text-fg-primary">{label}</span>
        <span className="text-xs text-fg-tertiary">{hint}</span>
      </Card>
    </Link>
  );
}

