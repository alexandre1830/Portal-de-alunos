"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { EXERCISE_TYPES } from "@/lib/blocks/schemas";
import { awardAchievements } from "@/lib/achievements/award";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface MarkPartCompletedResult {
  ok: boolean;
  error: string | null;
  // True quando a parte transicionou agora para completed (e o cliente
  // deve mostrar a celebração).
  justCompleted?: boolean;
  // XP creditado nesta conclusão (bônus de "part_completed"). 0 se
  // a parte já estava concluída antes.
  xpAwarded?: number;
}

// Marca a parte como concluída manualmente, para partes SEM exercícios.
// Quando há exercícios, a conclusão vem automaticamente de recomputePartProgress
// — esta action recusa para não bagunçar o caminho automático.
//
// Defesa em profundidade:
//  - autenticação do usuário
//  - matrícula ativa no curso da parte (ou modo pré-visualização admin)
//  - confirmação de que a parte realmente NÃO tem blocks de exercício
export async function markPartCompleted(
  partId: string,
  previewMode?: boolean,
): Promise<MarkPartCompletedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Honra previewMode somente para admin.
  let isAdminPreview = false;
  if (previewMode) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdminPreview = profile?.role === "admin";
  }

  const { data: part } = await admin
    .from("parts")
    .select("id, course_id")
    .eq("id", partId)
    .maybeSingle();
  if (!part) return { ok: false, error: "Parte não encontrada." };

  if (!isAdminPreview) {
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", part.course_id)
      .eq("status", "active")
      .maybeSingle();
    if (!enrollment) {
      return { ok: false, error: "Você não está matriculado neste curso." };
    }
  }

  // Bloqueia partes com exercícios — elas concluem automaticamente.
  const { data: exerciseBlocks } = await admin
    .from("blocks")
    .select("id")
    .eq("part_id", partId)
    .in("type", EXERCISE_TYPES)
    .limit(1);
  if ((exerciseBlocks ?? []).length > 0) {
    return {
      ok: false,
      error: "Esta parte conclui automaticamente ao acertar os exercícios.",
    };
  }

  // Dry-run admin: devolve ok=true sem persistir nada (zero conquistas,
  // zero part_progress, zero revalidate).
  if (isAdminPreview) {
    return { ok: true, error: null, justCompleted: false };
  }

  // Idempotente: se já está completed, não duplica completed_at.
  const { data: existing } = await admin
    .from("part_progress")
    .select("status")
    .eq("user_id", user.id)
    .eq("part_id", partId)
    .maybeSingle();
  const wasCompleted = existing?.status === "completed";

  await admin.from("part_progress").upsert(
    {
      user_id: user.id,
      part_id: partId,
      course_id: part.course_id,
      status: "completed",
      // Sem exercícios não há "estrelas" — fica 0; aluno terminou o conteúdo.
      stars: 0,
      score: null,
      completed_at: wasCompleted
        ? (undefined as never)
        : new Date().toISOString(),
    },
    { onConflict: "user_id,part_id" },
  );

  // Bônus de conclusão de parte — partes só de conteúdo (sem
  // exercícios) não geravam nenhum xp_event, então o trigger
  // apply_xp_event() nunca era chamado e o streak não subia naquele
  // dia. Inserimos um pequeno xp_event aqui para que QUALQUER parte
  // terminada conte para streak. Só na transição (idempotência).
  // Partes com exercícios já têm xp_events próprios via submitExercise,
  // então essa branch não duplica nada.
  let xpAwarded = 0;
  if (!wasCompleted) {
    xpAwarded = 5;
    await admin.from("xp_events").insert({
      user_id: user.id,
      amount: xpAwarded,
      source: "part_completed",
      part_id: partId,
    });
  }

  // Conquistas que dependem de progresso podem ser disparadas.
  await awardAchievements(admin, {
    userId: user.id,
    courseId: part.course_id,
    partId,
  });

  revalidatePath(`/partes/${partId}`);

  return {
    ok: true,
    error: null,
    justCompleted: !wasCompleted,
    xpAwarded,
  };
}
