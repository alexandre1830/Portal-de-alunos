import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Aluno",
  teacher: "Professor",
  admin: "Administrador",
};

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa em profundidade: o middleware já protege /painel, mas não confiamos
  // só nele para renderizar dados do usuário.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg-secondary">
          Portal de alunos
        </span>
        <ThemeToggle />
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">
          Olá{profile?.full_name ? `, ${profile.full_name}` : ""}!
        </h1>
        <p className="text-sm text-fg-secondary">
          Você está autenticado. Esta é a sua área protegida.
        </p>
      </div>

      <Card padded>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-fg-secondary">E-mail</dt>
            <dd className="text-fg-primary">{profile?.email ?? user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fg-secondary">Perfil</dt>
            <dd className="text-fg-primary">
              {profile ? ROLE_LABELS[profile.role] : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Sair
        </Button>
      </form>
    </main>
  );
}
