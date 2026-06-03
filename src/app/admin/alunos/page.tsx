import { CreateStudentForm } from "@/components/admin/CreateStudentForm";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

const ROLE_LABEL: Record<string, string> = {
  student: "Aluno",
  teacher: "Professor",
  admin: "Admin",
};

export default async function AdminStudentsPage() {
  const { supabase } = await requireAdmin();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary">Alunos</h1>
        <p className="text-sm text-fg-secondary">
          Crie e visualize as contas do portal. A matrícula em cursos é feita em
          cada curso, na aba “Matrículas”.
        </p>
      </div>

      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Criar aluno</h2>
        <CreateStudentForm />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Pessoas cadastradas
        </h2>
        {(profiles ?? []).length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">Ninguém cadastrado ainda.</p>
          </Card>
        ) : (
          <ul className="flex flex-col divide-y divide-border-primary overflow-hidden rounded-md border border-border-primary">
            {(profiles ?? []).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 bg-bg-primary px-4 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-fg-primary">
                    {p.full_name ?? "—"}
                  </span>
                  <span className="text-xs text-fg-tertiary">{p.email}</span>
                </div>
                <span className="rounded-full border border-border-primary px-2.5 py-1 text-xs text-fg-secondary">
                  {ROLE_LABEL[p.role] ?? p.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
