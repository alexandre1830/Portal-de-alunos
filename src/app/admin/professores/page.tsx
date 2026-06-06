import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserRowMenu } from "@/components/admin/UserRowMenu";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminTeachersPage() {
  const { supabase } = await requireAdmin();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "teacher")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary">Professores</h1>
          <p className="text-sm text-fg-secondary">
            Gerencie as contas de professores. Cada curso pode ser atribuído
            a um responsável no formulário do curso.
          </p>
        </div>
        <CreateUserDialog role="teacher" />
      </div>

      <section className="flex flex-col gap-3">
        {(profiles ?? []).length === 0 ? (
          <Card padded>
            <p className="text-sm text-fg-secondary">
              Nenhum professor cadastrado ainda.
            </p>
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
                <UserRowMenu
                  id={p.id}
                  fullName={p.full_name ?? ""}
                  email={p.email}
                  role="teacher"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
