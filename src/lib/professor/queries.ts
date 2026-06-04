import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface StudentRow {
  userId: string;
  email: string;
  fullName: string | null;
  enrollmentId: string;
  partsCompleted: number;
  totalParts: number;
  averageStars: number; // 0–3
  lastActivity: string | null;
}

// Agrega o desempenho de todos os alunos matriculados em um curso para o
// dashboard do professor. Faz 3 queries (enrollments, parts, part_progress) e
// junta em memória — volume esperado é pequeno (dezenas de alunos × dezenas
// de partes).
export async function getCourseStudents(
  supabase: Client,
  courseId: string,
): Promise<{ totalParts: number; students: StudentRow[] }> {
  const [enrRes, partsRes, progRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, user_id, user:profiles(email, full_name)")
      .eq("course_id", courseId)
      .order("created_at"),
    supabase.from("parts").select("id").eq("course_id", courseId),
    supabase
      .from("part_progress")
      .select("user_id, status, stars, updated_at")
      .eq("course_id", courseId),
  ]);

  const totalParts = partsRes.data?.length ?? 0;
  const progressByUser = new Map<
    string,
    { completed: number; starsSum: number; lastActivity: string | null }
  >();
  for (const row of progRes.data ?? []) {
    const acc = progressByUser.get(row.user_id) ?? {
      completed: 0,
      starsSum: 0,
      lastActivity: null,
    };
    if (row.status === "completed") {
      acc.completed += 1;
      acc.starsSum += row.stars ?? 0;
    }
    if (!acc.lastActivity || row.updated_at > acc.lastActivity) {
      acc.lastActivity = row.updated_at;
    }
    progressByUser.set(row.user_id, acc);
  }

  const students: StudentRow[] = (enrRes.data ?? []).map((enr) => {
    const acc = progressByUser.get(enr.user_id);
    return {
      userId: enr.user_id,
      email: enr.user?.email ?? "—",
      fullName: enr.user?.full_name ?? null,
      enrollmentId: enr.id,
      partsCompleted: acc?.completed ?? 0,
      totalParts,
      averageStars:
        acc && acc.completed > 0 ? acc.starsSum / acc.completed : 0,
      lastActivity: acc?.lastActivity ?? null,
    };
  });

  return { totalParts, students };
}
