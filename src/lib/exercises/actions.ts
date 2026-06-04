"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { awardAchievements } from "@/lib/achievements/award";
import {
  EXERCISE_TYPES,
  fillBlankSolution,
  multipleChoiceData,
  multipleChoiceSolution,
} from "@/lib/blocks/schemas";
import {
  gradeFillBlank,
  gradeMultipleChoice,
  XP_BY_STATE,
  type GradeState,
} from "@/lib/grading/grade";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface ExerciseResult {
  ok: boolean;
  state: GradeState | null;
  // Resposta correta — só preenchida quando o aluno erra (não vaza antes).
  correctAnswer: string | null;
  xpAwarded: number;
  error: string | null;
}

const inputSchema = z.object({
  blockId: z.string().uuid(),
  selectedIndex: z.number().int().nonnegative().optional(),
  text: z.string().optional(),
});

function fail(error: string): ExerciseResult {
  return { ok: false, state: null, correctAnswer: null, xpAwarded: 0, error };
}

export async function submitExercise(raw: {
  blockId: string;
  selectedIndex?: number;
  text?: string;
}): Promise<ExerciseResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return fail("Entrada inválida.");
  const { blockId, selectedIndex, text } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const admin = createAdminClient();

  const { data: block } = await admin
    .from("blocks")
    .select("id, type, part_id, course_id, data")
    .eq("id", blockId)
    .maybeSingle();
  if (!block) return fail("Exercício não encontrado.");

  // Segurança: só aluno com matrícula ativa pode responder.
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", block.course_id)
    .eq("status", "active")
    .maybeSingle();
  if (!enrollment) return fail("Você não está matriculado neste curso.");

  const { data: solutionRow } = await admin
    .from("exercise_solutions")
    .select("solution")
    .eq("block_id", blockId)
    .maybeSingle();
  if (!solutionRow) return fail("Exercício sem gabarito configurado.");

  // --- Correção (server-side; o gabarito nunca sai daqui) ---
  let state: GradeState;
  let correctAnswer: string | null = null;

  if (block.type === "multiple_choice") {
    const sol = multipleChoiceSolution.safeParse(solutionRow.solution);
    const pub = multipleChoiceData.safeParse(block.data);
    if (!sol.success || !pub.success) return fail("Exercício mal configurado.");
    if (typeof selectedIndex !== "number") return fail("Selecione uma opção.");
    state = gradeMultipleChoice(selectedIndex, sol.data);
    if (state === "incorrect") {
      correctAnswer = pub.data.options[sol.data.answerIndex] ?? null;
    }
  } else if (block.type === "fill_blank") {
    const sol = fillBlankSolution.safeParse(solutionRow.solution);
    if (!sol.success) return fail("Exercício mal configurado.");
    if (typeof text !== "string" || text.trim().length === 0) {
      return fail("Digite sua resposta.");
    }
    state = gradeFillBlank(text, sol.data);
    if (state === "incorrect") correctAnswer = sol.data.answer;
  } else {
    return fail("Tipo de exercício não suportado.");
  }

  // --- Tentativas (idempotência de XP) ---
  const { data: existing } = await admin
    .from("exercise_attempts")
    .select("attempts, solved, solved_first_try")
    .eq("user_id", user.id)
    .eq("block_id", blockId)
    .maybeSingle();

  const wasSolved = existing?.solved ?? false;
  const attempts = (existing?.attempts ?? 0) + 1;
  const nowSolved = wasSolved || state !== "incorrect";
  const solvedFirstTry =
    existing?.solved_first_try ?? (attempts === 1 && state === "perfect");

  await admin.from("exercise_attempts").upsert(
    {
      user_id: user.id,
      block_id: blockId,
      part_id: block.part_id,
      course_id: block.course_id,
      attempts,
      solved: nowSolved,
      solved_first_try: solvedFirstTry,
    },
    { onConflict: "user_id,block_id" },
  );

  // XP só na primeira vez que o aluno resolve o exercício.
  let xpAwarded = 0;
  if (!wasSolved && state !== "incorrect" && XP_BY_STATE[state] > 0) {
    xpAwarded = XP_BY_STATE[state];
    await admin.from("xp_events").insert({
      user_id: user.id,
      amount: xpAwarded,
      source: `exercise:${block.type}`,
      part_id: block.part_id,
    });
  }

  await recomputePartProgress(admin, user.id, block.part_id, block.course_id);
  await awardAchievements(admin, {
    userId: user.id,
    courseId: block.course_id,
    partId: block.part_id,
  });

  return { ok: true, state, correctAnswer, xpAwarded, error: null };
}

// Recalcula o progresso da parte: completa quando todos os exercícios foram
// resolvidos; estrelas pela proporção de acertos de primeira.
async function recomputePartProgress(
  admin: AdminClient,
  userId: string,
  partId: string,
  courseId: string,
): Promise<void> {
  const { data: exerciseBlocks } = await admin
    .from("blocks")
    .select("id")
    .eq("part_id", partId)
    .in("type", EXERCISE_TYPES);

  const total = exerciseBlocks?.length ?? 0;
  if (total === 0) return;

  const { data: attempts } = await admin
    .from("exercise_attempts")
    .select("solved, solved_first_try")
    .eq("user_id", userId)
    .eq("part_id", partId);

  const solved = (attempts ?? []).filter((a) => a.solved).length;
  const firstTry = (attempts ?? []).filter((a) => a.solved_first_try).length;
  const allSolved = solved >= total;
  const ratio = firstTry / total;
  const stars = allSolved ? (ratio === 1 ? 3 : ratio >= 0.5 ? 2 : 1) : 0;
  const score = Math.round((solved / total) * 100);

  await admin.from("part_progress").upsert(
    {
      user_id: userId,
      part_id: partId,
      course_id: courseId,
      status: allSolved ? "completed" : "in_progress",
      stars,
      score,
      completed_at: allSolved ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,part_id" },
  );
}
