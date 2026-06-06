import { redirect } from "next/navigation";

import { ReviewSession } from "@/components/painel/ReviewSession";
import { TargetIllustration } from "@/components/illustrations/TargetIllustration";
import { BackLink } from "@/components/shared/BackLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <BackLink href="/painel/revisar" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">
          Sessão de revisão
        </h1>
        <p className="text-sm text-fg-secondary">
          Digite a resposta de cada item. A correção e o próximo agendamento
          são automáticos. Acertar pontua XP reduzido; quase e errado não
          pontuam.
        </p>
      </div>

      {items.length === 0 ? (
        <Card padded>
          <EmptyState
            illustration={<TargetIllustration className="h-20 w-20" />}
            title="Nada para revisar agora"
            description="Quando você errar um exercício ou concluir uma parte com vocabulário, novos itens aparecem aqui na hora certa."
          />
        </Card>
      ) : (
        <ReviewSession items={items} />
      )}
    </main>
  );
}
