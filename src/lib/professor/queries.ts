import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

// Resumo de um aluno acompanhado pelo professor — agregado em todos os
// cursos em que ele está matriculado.
export interface MyStudentRow {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  // Matrículas ativas — usado para listar "está em N curso(s)".
  enrolledCourses: number;
  partsCompleted: number;
  totalParts: number;
  // Média de estrelas considerando apenas partes concluídas.
  averageStars: number;
  // Última atividade em part_progress (qualquer curso).
  lastActivity: string | null;
}

// Lista os alunos acompanhados pelo professor + métricas agregadas em
// todos os cursos em que cada aluno está matriculado. O conjunto de
// alunos vem de teacher_students; a partir daí cruzamos com enrollments
// (cursos ativos) e part_progress (progresso) para o totalParts e
// completed.
export async function getMyStudents(
  supabase: Client,
  teacherId: string,
): Promise<MyStudentRow[]> {
  // 1. IDs dos alunos vinculados a este professor.
  const { data: links } = await supabase
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId);
  const studentIds = (links ?? []).map((l) => l.student_id);
  if (studentIds.length === 0) return [];

  // 2. Profile dos alunos.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", studentIds);

  // 3. Enrollments ativos dos alunos — pega course_ids para o total de
  //    partes e para contar cursos por aluno.
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id, course_id")
    .in("user_id", studentIds)
    .eq("status", "active");

  const courseIds = Array.from(
    new Set((enrollments ?? []).map((e) => e.course_id)),
  );

  // 4. Total de partes por curso (universo do progresso).
  const totalPartsByCourse = new Map<string, number>();
  if (courseIds.length > 0) {
    const { data: parts } = await supabase
      .from("parts")
      .select("course_id")
      .in("course_id", courseIds);
    for (const p of parts ?? []) {
      totalPartsByCourse.set(
        p.course_id,
        (totalPartsByCourse.get(p.course_id) ?? 0) + 1,
      );
    }
  }

  // 5. Progress agregado por aluno (em todos os cursos juntos).
  const { data: progress } = await supabase
    .from("part_progress")
    .select("user_id, course_id, status, stars, updated_at")
    .in("user_id", studentIds);

  // 6. Agrega.
  const coursesByStudent = new Map<string, Set<string>>();
  for (const e of enrollments ?? []) {
    const set = coursesByStudent.get(e.user_id) ?? new Set<string>();
    set.add(e.course_id);
    coursesByStudent.set(e.user_id, set);
  }

  type Acc = {
    completed: number;
    starsSum: number;
    lastActivity: string | null;
  };
  const accByStudent = new Map<string, Acc>();
  for (const row of progress ?? []) {
    const acc = accByStudent.get(row.user_id) ?? {
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
    accByStudent.set(row.user_id, acc);
  }

  return (profiles ?? []).map((p) => {
    const courses = coursesByStudent.get(p.id) ?? new Set();
    let totalParts = 0;
    for (const cid of courses) {
      totalParts += totalPartsByCourse.get(cid) ?? 0;
    }
    const acc = accByStudent.get(p.id);
    return {
      userId: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      enrolledCourses: courses.size,
      partsCompleted: acc?.completed ?? 0,
      totalParts,
      averageStars:
        acc && acc.completed > 0 ? acc.starsSum / acc.completed : 0,
      lastActivity: acc?.lastActivity ?? null,
    };
  });
}

// Detalhe de UM aluno: cursos onde está matriculado + progresso em cada.
export interface StudentCourseProgress {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  language: string;
  level: string;
  partsCompleted: number;
  totalParts: number;
  averageStars: number;
  lastActivity: string | null;
}

export interface MyStudentDetail {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  courses: StudentCourseProgress[];
}

// Detalha o progresso do aluno em todos os cursos ativos dele. Usada
// pela página /professor/alunos/[studentId].
export async function getStudentDetail(
  supabase: Client,
  studentId: string,
): Promise<MyStudentDetail | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", studentId)
    .maybeSingle();
  if (!profile) return null;

  const [gamRes, enrRes, progRes] = await Promise.all([
    supabase
      .from("user_gamification")
      .select("total_xp, current_streak, longest_streak")
      .eq("user_id", studentId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select("course:courses(id, title, slug, language, level)")
      .eq("user_id", studentId)
      .eq("status", "active"),
    supabase
      .from("part_progress")
      .select("course_id, status, stars, updated_at")
      .eq("user_id", studentId),
  ]);

  // Total de partes por curso.
  const courseIds = (enrRes.data ?? [])
    .map((row) => row.course?.id)
    .filter((id): id is string => !!id);
  const totalPartsByCourse = new Map<string, number>();
  if (courseIds.length > 0) {
    const { data: parts } = await supabase
      .from("parts")
      .select("course_id")
      .in("course_id", courseIds);
    for (const p of parts ?? []) {
      totalPartsByCourse.set(
        p.course_id,
        (totalPartsByCourse.get(p.course_id) ?? 0) + 1,
      );
    }
  }

  // Progresso por curso.
  type Acc = {
    completed: number;
    starsSum: number;
    lastActivity: string | null;
  };
  const accByCourse = new Map<string, Acc>();
  for (const row of progRes.data ?? []) {
    const acc = accByCourse.get(row.course_id) ?? {
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
    accByCourse.set(row.course_id, acc);
  }

  const courses: StudentCourseProgress[] = (enrRes.data ?? [])
    .map((row) => row.course)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => {
      const acc = accByCourse.get(c.id);
      return {
        courseId: c.id,
        courseTitle: c.title,
        courseSlug: c.slug,
        language: c.language,
        level: c.level,
        partsCompleted: acc?.completed ?? 0,
        totalParts: totalPartsByCourse.get(c.id) ?? 0,
        averageStars:
          acc && acc.completed > 0 ? acc.starsSum / acc.completed : 0,
        lastActivity: acc?.lastActivity ?? null,
      };
    });

  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    totalXp: gamRes.data?.total_xp ?? 0,
    currentStreak: gamRes.data?.current_streak ?? 0,
    longestStreak: gamRes.data?.longest_streak ?? 0,
    courses,
  };
}
