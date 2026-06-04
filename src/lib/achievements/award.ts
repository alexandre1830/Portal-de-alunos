import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

// Conquistas detectadas após uma mudança de progresso. Os `code` precisam
// existir na tabela `achievements` (rode `pnpm seed:achievements`).
const CODES = [
  "first_part_completed",
  "first_perfect_part",
  "streak_3",
  "streak_7",
  "first_lesson_completed",
] as const;
type AchievementCode = (typeof CODES)[number];

export interface AwardContext {
  userId: string;
  courseId: string;
  partId: string;
}

// Verifica condições e concede conquistas ainda não obtidas. Cada concessão
// também gera um xp_event (source: "achievement:<code>") para alimentar XP/
// streak via o trigger existente. Idempotente: a unique (user_id, achievement_id)
// barra duplicatas, e checamos antes para não gerar inserts inúteis.
export async function awardAchievements(
  admin: AdminClient,
  ctx: AwardContext,
): Promise<void> {
  const { userId, courseId, partId } = ctx;

  // 1. Carrega o catálogo e o que o usuário já tem.
  const [{ data: catalog }, { data: owned }] = await Promise.all([
    admin
      .from("achievements")
      .select("id, code, xp_reward")
      .in("code", [...CODES]),
    admin
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId),
  ]);

  const byCode = new Map<string, { id: string; xp_reward: number }>();
  for (const a of catalog ?? []) {
    byCode.set(a.code, { id: a.id, xp_reward: a.xp_reward });
  }
  const ownedIds = new Set((owned ?? []).map((o) => o.achievement_id));

  // 2. Pré-carrega o que precisamos para todas as condições, em paralelo.
  const [progRes, gamRes, partRes] = await Promise.all([
    admin
      .from("part_progress")
      .select("part_id, status, stars")
      .eq("user_id", userId),
    admin
      .from("user_gamification")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("parts").select("id, lesson_id").eq("id", partId).maybeSingle(),
  ]);

  const allProgress = progRes.data ?? [];
  const completed = allProgress.filter((p) => p.status === "completed");
  const perfect = completed.filter((p) => p.stars === 3);
  const streak = gamRes.data?.current_streak ?? 0;
  const longest = gamRes.data?.longest_streak ?? 0;
  const lessonId = partRes.data?.lesson_id ?? null;

  // 3. Mapeia condições atendidas.
  const reached: AchievementCode[] = [];
  if (completed.length >= 1) reached.push("first_part_completed");
  if (perfect.length >= 1) reached.push("first_perfect_part");
  if (streak >= 3 || longest >= 3) reached.push("streak_3");
  if (streak >= 7 || longest >= 7) reached.push("streak_7");

  if (lessonId) {
    const [{ data: lessonParts }, { data: lessonProgress }] = await Promise.all([
      admin.from("parts").select("id").eq("lesson_id", lessonId),
      admin
        .from("part_progress")
        .select("part_id")
        .eq("user_id", userId)
        .eq("status", "completed"),
    ]);
    const total = lessonParts?.length ?? 0;
    const doneSet = new Set((lessonProgress ?? []).map((p) => p.part_id));
    const lessonDone =
      total > 0 && (lessonParts ?? []).every((p) => doneSet.has(p.id));
    if (lessonDone) reached.push("first_lesson_completed");
  }

  // 4. Concede só as novas. Para cada nova, insere user_achievement e xp_event.
  for (const code of reached) {
    const entry = byCode.get(code);
    if (!entry || ownedIds.has(entry.id)) continue;

    const { error: insErr } = await admin
      .from("user_achievements")
      .insert({ user_id: userId, achievement_id: entry.id });
    if (insErr) continue;

    if (entry.xp_reward > 0) {
      await admin.from("xp_events").insert({
        user_id: userId,
        amount: entry.xp_reward,
        source: `achievement:${code}`,
        part_id: partId,
      });
    }
  }
  void courseId; // reservado para conquistas por curso no futuro
}
