import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewSession } from "@/components/painel/ReviewSession";
import { Card } from "@/components/ui/Card";
import { listDueItems } from "@/lib/srs/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SessaoRevisaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await listDueItems(supabase, user.id, 20);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <Link
        href="/painel/revisar"
        className="text-sm text-fg-secondary hover:text-fg-primary"
      >
        ← Voltar
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">
          Sessão de revisão
        </h1>
        <p className="text-sm text-fg-secondary">
          Tente lembrar antes de revelar a resposta. A cada item, escolha
          como foi: a próxima revisão é agendada automaticamente.
        </p>
      </div>

      {items.length === 0 ? (
        <Card padded>
          <p className="text-sm text-fg-secondary">
            Você não tem itens prontos para revisar agora. Quando errar um
            exercício ou concluir uma parte com vocabulário, eles aparecem
            aqui.
          </p>
        </Card>
      ) : (
        <ReviewSession items={items} />
      )}
    </main>
  );
}
