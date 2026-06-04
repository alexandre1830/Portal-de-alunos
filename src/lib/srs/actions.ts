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

  revalidatePath("/painel/revisar");
  revalidatePath("/painel/revisar/sessao");
  revalidatePath("/painel");
}
