import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface AdminOverview {
  // Alunos com pelo menos uma matrícula ativa em algum curso.
  enrolledStudents: number;
  // Alunos (role=student) que tiveram qualquer xp_event nos últimos
  // 7 dias — proxy razoável de "estudaram alguma coisa".
  activeStudents: number;
  // Total de profiles com role=teacher.
  teachers: number;
  // Total de cursos cadastrados (rascunho + publicado).
  courses: number;
  // Quebras complementares para evitar uma segunda viagem ao banco
  // quando o admin quiser entender melhor cada número.
  publishedCourses: number;
}

// Agrega os números do dashboard inicial do admin. Cada chamada faz 5
// counts em paralelo — barato e dentro do regime de RLS (admin tem
// SELECT em todas as tabelas via private.is_admin()).
export async function getAdminOverview(
  supabase: Client,
): Promise<AdminOverview> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1) Lista de IDs de alunos com matrícula ativa (distinct).
  //    Postgrest não tem distinct count direto numa única chamada,
  //    então puxamos os user_id e contamos no JS. Para escalas
  //    pequenas/médias é OK; se virar gargalo, dá pra criar uma view.
  const enrollmentsRes = await supabase
    .from("enrollments")
    .select("user_id")
    .eq("status", "active");

  // 2) IDs de quem teve xp_event nos últimos 7 dias.
  const recentXpRes = await supabase
    .from("xp_events")
    .select("user_id")
    .gte("created_at", sevenDaysAgo.toISOString());

  // 3, 4, 5) Counts simples em paralelo.
  const [teachersRes, coursesRes, publishedRes, studentIdsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "teacher"),
      supabase
        .from("courses")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      // Conjunto de IDs com role=student — usado para filtrar
      // o "alunos ativos" para não contar professor/admin que por
      // ventura tenham xp_event de teste.
      supabase.from("profiles").select("id").eq("role", "student"),
    ]);

  const enrolledStudents = new Set(
    (enrollmentsRes.data ?? []).map((r) => r.user_id),
  ).size;

  const studentIdSet = new Set(
    (studentIdsRes.data ?? []).map((r) => r.id),
  );
  const activeIds = new Set<string>();
  for (const ev of recentXpRes.data ?? []) {
    if (studentIdSet.has(ev.user_id)) activeIds.add(ev.user_id);
  }

  return {
    enrolledStudents,
    activeStudents: activeIds.size,
    teachers: teachersRes.count ?? 0,
    courses: coursesRes.count ?? 0,
    publishedCourses: publishedRes.count ?? 0,
  };
}
