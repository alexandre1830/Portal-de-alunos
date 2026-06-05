import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { BackLink } from "@/components/shared/BackLink";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export default async function TrocarSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <BackLink href="/painel" label="Voltar ao painel" />
        <h1 className="text-2xl font-semibold text-fg-primary">Trocar senha</h1>
        <p className="text-sm text-fg-secondary">
          Defina uma nova senha para <strong>{user.email}</strong>.
        </p>
      </div>

      <Card padded>
        <ResetPasswordForm />
      </Card>
    </main>
  );
}
