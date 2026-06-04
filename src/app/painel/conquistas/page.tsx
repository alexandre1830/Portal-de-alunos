import Link from "next/link";
import { redirect } from "next/navigation";

import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function ConquistasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // O catálogo de achievements é público (policy `achievements_select using
  // true`); user_achievements é filtrado por RLS para o próprio usuário.
  const [{ data: catalog }, { data: owned }] = await Promise.all([
    supabase
      .from("achievements")
      .select("id, code, title, description, xp_reward")
      .order("created_at"),
    supabase
      .from("user_achievements")
      .select("achievement_id, earned_at")
      .eq("user_id", user.id),
  ]);

  const earnedById = new Map(
    (owned ?? []).map((o) => [o.achievement_id, o.earned_at]),
  );
  const items = (catalog ?? []).map((a) => ({
    ...a,
    earnedAt: earnedById.get(a.id) ?? null,
  }));
  const obtained = items.filter((i) => i.earnedAt);
  const locked = items.filter((i) => !i.earnedAt);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <Link
          href="/painel"
          className="text-sm text-fg-secondary hover:text-fg-primary"
        >
          ← Voltar ao painel
        </Link>
        <h1 className="text-2xl font-semibold text-fg-primary">Conquistas</h1>
        <p className="text-sm text-fg-secondary">
          {obtained.length} de {items.length} conquistadas.
        </p>
      </div>

      {items.length === 0 && (
        <Card padded>
          <p className="text-sm text-fg-secondary">
            Nenhuma conquista cadastrada.
          </p>
        </Card>
      )}

      {obtained.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-fg-primary">
            Conquistadas
          </h2>
          <ul className="flex flex-col gap-3">
            {obtained.map((a) => (
              <li key={a.id}>
                <Card padded className="flex items-start gap-3">
                  <TrophyIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-fg-primary">{a.title}</span>
                    {a.description && (
                      <span className="text-sm text-fg-secondary">
                        {a.description}
                      </span>
                    )}
                    <span className="mt-1 text-xs text-fg-tertiary">
                      Conquistada em {formatDate(a.earnedAt!)}
                      {a.xp_reward > 0 ? ` · +${a.xp_reward} XP` : ""}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {locked.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-fg-primary">
            Para conquistar
          </h2>
          <ul className="flex flex-col gap-3">
            {locked.map((a) => (
              <li key={a.id}>
                <Card padded className={cn("flex items-start gap-3 opacity-60")}>
                  <TrophyIcon className="mt-0.5 h-5 w-5 shrink-0 text-fg-tertiary" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-fg-primary">{a.title}</span>
                    {a.description && (
                      <span className="text-sm text-fg-secondary">
                        {a.description}
                      </span>
                    )}
                    {a.xp_reward > 0 && (
                      <span className="mt-1 text-xs text-fg-tertiary">
                        Recompensa: +{a.xp_reward} XP
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
