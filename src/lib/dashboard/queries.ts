import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { Course } from "@/types/content";
import type { UserGamification } from "@/types/gamification";

type Client = SupabaseClient<Database>;

export interface StudentDashboard {
  gamification: UserGamification | null;
  courses: Course[];
  achievementsCount: number;
}

// Busca os dados do dashboard do aluno (gamificação + cursos matriculados).
// A RLS garante que só vêm dados do próprio usuário / cursos acessíveis.
export async function getStudentDashboard(
  supabase: Client,
  userId: string,
): Promise<StudentDashboard> {
  const [gamificationResult, enrollmentsResult, achievementsResult] =
    await Promise.all([
      supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("enrollments")
        .select("course:courses(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_achievements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  const courses = (enrollmentsResult.data ?? [])
    .map((row) => row.course)
    .filter((course): course is Course => course !== null);

  return {
    gamification: gamificationResult.data,
    courses,
    achievementsCount: achievementsResult.count ?? 0,
  };
}
