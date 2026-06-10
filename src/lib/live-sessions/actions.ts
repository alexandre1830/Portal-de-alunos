"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/guard";

const meetUrlSchema = z
  .string()
  .trim()
  .min(5, "Cole um link válido.")
  .max(500, "Link grande demais.");

const baseSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora deve estar no formato HH:MM."),
  meetUrl: meetUrlSchema,
});

export interface LiveSessionActionResult {
  ok: boolean;
  error: string | null;
}

export async function createLiveSession(
  formData: FormData,
): Promise<LiveSessionActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = baseSchema.safeParse({
    studentId: formData.get("student_id"),
    teacherId: formData.get("teacher_id"),
    dayOfWeek: formData.get("day_of_week"),
    startTime: formData.get("start_time"),
    meetUrl: formData.get("meet_url"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  const { studentId, teacherId, dayOfWeek, startTime, meetUrl } = parsed.data;

  // Confere que o vínculo (teacher, student) existe em teacher_students —
  // o FK composto da tabela já garante isso, mas pegar o erro aqui dá
  // mensagem amigável em vez de "violates foreign key constraint".
  const { data: link } = await supabase
    .from("teacher_students")
    .select("teacher_id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!link) {
    return {
      ok: false,
      error: "Esse professor não está vinculado a esse aluno.",
    };
  }

  const { error } = await supabase.from("student_live_sessions").insert({
    student_id: studentId,
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    start_time: `${startTime}:00`,
    meet_url: meetUrl,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/painel");
  return { ok: true, error: null };
}

const updateSchema = baseSchema.extend({
  id: z.string().uuid(),
});

export async function updateLiveSession(
  formData: FormData,
): Promise<LiveSessionActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    studentId: formData.get("student_id"),
    teacherId: formData.get("teacher_id"),
    dayOfWeek: formData.get("day_of_week"),
    startTime: formData.get("start_time"),
    meetUrl: formData.get("meet_url"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  const { id, studentId, teacherId, dayOfWeek, startTime, meetUrl } =
    parsed.data;

  const { error } = await supabase
    .from("student_live_sessions")
    .update({
      teacher_id: teacherId,
      day_of_week: dayOfWeek,
      start_time: `${startTime}:00`,
      meet_url: meetUrl,
    })
    .eq("id", id)
    .eq("student_id", studentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/painel");
  return { ok: true, error: null };
}

export async function deleteLiveSession(
  formData: FormData,
): Promise<LiveSessionActionResult> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!id || !studentId) return { ok: false, error: "Dados inválidos." };

  const { error } = await supabase
    .from("student_live_sessions")
    .delete()
    .eq("id", id)
    .eq("student_id", studentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/painel");
  return { ok: true, error: null };
}
