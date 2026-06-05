"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { applySm2, RATING_QUALITY, type ReviewRating } from "@/lib/srs/sm2";
import { createClient } from "@/lib/supabase/server";

// Recebe a avaliação do aluno para um item de revisão e aplica SM-2.
// RLS já garante que ele só atualiza os próprios itens; ainda assim
// reconferimos user_id por defesa em profundidade.
export async function reviewItem(formData: FormData): Promise<void> {
  const itemId = String(formData.get("item_id") ?? "");
  const rating = String(formData.get("rating") ?? "") as ReviewRating;
  if (!itemId) return;
  if (!(rating in RATING_QUALITY)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("srs_items")
    .select("ease_factor, interval_days, repetitions")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!item) return;

  const next = applySm2(
    {
      easeFactor: Number(item.ease_factor),
      intervalDays: item.interval_days,
      repetitions: item.repetitions,
    },
    RATING_QUALITY[rating],
  );

  await supabase
    .from("srs_items")
    .update({
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      next_review_at: next.nextReviewAt.toISOString(),
      last_quality: RATING_QUALITY[rating],
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  // Incrementa o contador de revisões — alimenta o conjunto "Hora de
  // relembrar" sem precisar de scan agregado em srs_items.repetitions
  // (que zera em "again" pelo SM-2 e subestimaria a contagem).
  // RLS permite só read em user_gamification para o aluno; aqui usamos
  // o cliente normal porque temos uma policy de update server-only?
  // Não — quem grava agregados é trigger. Vamos via service_role aqui.
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // increment atomico via SQL: read current, write +1. Como o trigger
    // de xp_events também escreve em user_gamification, há risco de race;
    // mas não para essa coluna específica, então tudo bem.
    const { data: cur } = await admin
      .from("user_gamification")
      .select("total_srs_reviews")
      .eq("user_id", user.id)
      .maybeSingle();
    const prev = cur?.total_srs_reviews ?? 0;
    await admin
      .from("user_gamification")
      .update({ total_srs_reviews: prev + 1 })
      .eq("user_id", user.id);

    // Agora pode haver conquistas novas do conjunto "reviewer".
    const { awardAchievements } = await import("@/lib/achievements/award");
    await awardAchievements(admin, { userId: user.id });
  } catch {
    // Falha em incrementar contador / detectar conquista é não-bloqueante.
  }

  revalidatePath("/painel/revisar");
  revalidatePath("/painel/revisar/sessao");
  revalidatePath("/painel");
}
