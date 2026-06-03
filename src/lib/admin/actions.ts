"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { randomBytes } from "node:crypto";

import { requireAdmin } from "@/lib/admin/guard";
import type { CreateStudentState, EnrollState } from "@/lib/admin/types";
import { createAdminClient } from "@/lib/supabase/admin";

// ====================================================================
// Helpers
// ====================================================================
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Próxima posição (último + 1) dentro de um escopo.
async function nextPosition(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: "modules" | "lessons" | "parts" | "blocks",
  scopeCol: string,
  scopeVal: string,
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("position")
    .eq(scopeCol, scopeVal)
    .order("position", { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? -1) + 1;
}

// Troca de posição com o vizinho (reordenação).
async function reorder(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: "modules" | "lessons" | "parts" | "blocks",
  scopeCol: string,
  scopeVal: string,
  id: string,
  dir: "up" | "down",
): Promise<void> {
  const { data: sibs } = await supabase
    .from(table)
    .select("id, position")
    .eq(scopeCol, scopeVal)
    .order("position");
  if (!sibs) return;
  const idx = sibs.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= sibs.length) return;
  const a = sibs[idx]!;
  const b = sibs[swapIdx]!;
  await supabase.from(table).update({ position: b.position }).eq("id", a.id);
  await supabase.from(table).update({ position: a.position }).eq("id", b.id);
}

// ====================================================================
// Cursos
// ====================================================================
export async function createCourse(formData: FormData) {
  const { supabase } = await requireAdmin();
  const title = str(formData, "title");
  if (!title) return;
  const slug = slugify(str(formData, "slug") || title) || `curso-${Date.now()}`;
  const language = str(formData, "language") === "es" ? "es" : "en";
  const level = str(formData, "level") || "a1";
  const { data } = await supabase
    .from("courses")
    .insert({ title, slug, language, level: level as never })
    .select("id")
    .single();
  revalidatePath("/admin/cursos");
  if (data) redirect(`/admin/cursos/${data.id}/modulos`);
}

export async function updateCourse(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  await supabase
    .from("courses")
    .update({
      title: str(formData, "title"),
      slug: slugify(str(formData, "slug")),
      description: str(formData, "description") || null,
      language: str(formData, "language") === "es" ? "es" : "en",
      level: (str(formData, "level") || "a1") as never,
      is_published: formData.get("is_published") === "on",
    })
    .eq("id", id);
  revalidatePath(`/admin/cursos/${id}/config`);
  revalidatePath("/admin/cursos");
}

export async function deleteCourse(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("courses").delete().eq("id", str(formData, "id"));
  revalidatePath("/admin/cursos");
  redirect("/admin/cursos");
}

// ====================================================================
// Módulos
// ====================================================================
export async function createModule(formData: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = str(formData, "course_id");
  const title = str(formData, "title");
  if (!title) return;
  const position = await nextPosition(supabase, "modules", "course_id", courseId);
  await supabase.from("modules").insert({ course_id: courseId, title, position });
  revalidatePath(`/admin/cursos/${courseId}/modulos`);
}

export async function updateModule(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("modules")
    .update({ title: str(formData, "title") })
    .eq("id", str(formData, "id"));
  revalidatePath(`/admin/cursos/${str(formData, "course_id")}/modulos`);
}

export async function deleteModule(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("modules").delete().eq("id", str(formData, "id"));
  revalidatePath(`/admin/cursos/${str(formData, "course_id")}/modulos`);
}

export async function moveModule(formData: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = str(formData, "course_id");
  await reorder(supabase, "modules", "course_id", courseId, str(formData, "id"), str(formData, "dir") as "up" | "down");
  revalidatePath(`/admin/cursos/${courseId}/modulos`);
}

// ====================================================================
// Lições
// ====================================================================
// Template das 8 seções padrão das lições (PDFs USpeaK, ADR 0004).
const DEFAULT_PART_TEMPLATE: { title: string; kind: "regular" | "golden" }[] = [
  { title: "Abertura", kind: "regular" },
  { title: "Vocabulary", kind: "regular" },
  { title: "Lesson topic", kind: "regular" },
  { title: "Grammar", kind: "regular" },
  { title: "Pronunciation", kind: "regular" },
  { title: "Dialogue", kind: "regular" },
  { title: "Exercises", kind: "regular" },
  { title: "Revisão", kind: "golden" },
];

export async function createLesson(formData: FormData) {
  const { supabase } = await requireAdmin();
  const moduleId = str(formData, "module_id");
  const courseId = str(formData, "course_id");
  const title = str(formData, "title");
  if (!title) return;
  const position = await nextPosition(supabase, "lessons", "module_id", moduleId);
  const { data: lesson } = await supabase
    .from("lessons")
    .insert({ module_id: moduleId, course_id: courseId, title, position })
    .select("id")
    .single();

  // Toda nova lição já nasce com o template padrão (admin edita depois).
  if (lesson) {
    await supabase.from("parts").insert(
      DEFAULT_PART_TEMPLATE.map((p, i) => ({
        lesson_id: lesson.id,
        course_id: courseId,
        title: p.title,
        kind: p.kind,
        position: i,
      })),
    );
  }

  revalidatePath(`/admin/cursos/${courseId}/modulos`);
}

// Duplica uma lição completa (partes + blocos + gabaritos) dentro do mesmo
// módulo, como rascunho. Posicionada após a última.
export async function duplicateLesson(formData: FormData) {
  const { supabase } = await requireAdmin();
  const sourceId = str(formData, "id");
  const courseId = str(formData, "course_id");

  const { data: source } = await supabase
    .from("lessons")
    .select("module_id, title")
    .eq("id", sourceId)
    .single();
  if (!source) return;

  const position = await nextPosition(supabase, "lessons", "module_id", source.module_id);
  const { data: newLesson } = await supabase
    .from("lessons")
    .insert({
      module_id: source.module_id,
      course_id: courseId,
      title: `${source.title} (cópia)`,
      position,
      is_published: false,
    })
    .select("id")
    .single();
  if (!newLesson) return;

  const { data: parts } = await supabase
    .from("parts")
    .select("id, title, kind, position")
    .eq("lesson_id", sourceId)
    .order("position");

  for (const part of parts ?? []) {
    const { data: newPart } = await supabase
      .from("parts")
      .insert({
        lesson_id: newLesson.id,
        course_id: courseId,
        title: part.title,
        kind: part.kind,
        position: part.position,
      })
      .select("id")
      .single();
    if (!newPart) continue;

    const { data: blocks } = await supabase
      .from("blocks")
      .select("id, type, data, position")
      .eq("part_id", part.id)
      .order("position");

    for (const block of blocks ?? []) {
      const { data: newBlock } = await supabase
        .from("blocks")
        .insert({
          part_id: newPart.id,
          lesson_id: newLesson.id,
          course_id: courseId,
          type: block.type,
          data: block.data as never,
          position: block.position,
        })
        .select("id")
        .single();
      if (!newBlock) continue;

      const { data: solution } = await supabase
        .from("exercise_solutions")
        .select("solution")
        .eq("block_id", block.id)
        .maybeSingle();
      if (solution) {
        await supabase.from("exercise_solutions").insert({
          block_id: newBlock.id,
          course_id: courseId,
          solution: solution.solution as never,
        });
      }
    }
  }

  revalidatePath(`/admin/cursos/${courseId}/modulos`);
}

export async function updateLesson(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  await supabase
    .from("lessons")
    .update({
      title: str(formData, "title"),
      is_published: formData.get("is_published") === "on",
    })
    .eq("id", id);
  revalidatePath(`/admin/licoes/${id}`);
  revalidatePath(`/admin/cursos/${str(formData, "course_id")}/modulos`);
}

export async function deleteLesson(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lessons").delete().eq("id", str(formData, "id"));
  revalidatePath(`/admin/cursos/${str(formData, "course_id")}/modulos`);
}

export async function moveLesson(formData: FormData) {
  const { supabase } = await requireAdmin();
  await reorder(supabase, "lessons", "module_id", str(formData, "module_id"), str(formData, "id"), str(formData, "dir") as "up" | "down");
  revalidatePath(`/admin/cursos/${str(formData, "course_id")}/modulos`);
}

// ====================================================================
// Partes
// ====================================================================
export async function createPart(formData: FormData) {
  const { supabase } = await requireAdmin();
  const lessonId = str(formData, "lesson_id");
  const courseId = str(formData, "course_id");
  const title = str(formData, "title");
  if (!title) return;
  const kind = str(formData, "kind") === "golden" ? "golden" : "regular";
  const position = await nextPosition(supabase, "parts", "lesson_id", lessonId);
  await supabase
    .from("parts")
    .insert({ lesson_id: lessonId, course_id: courseId, title, kind, position });
  revalidatePath(`/admin/licoes/${lessonId}`);
}

export async function updatePart(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("parts")
    .update({
      title: str(formData, "title"),
      kind: str(formData, "kind") === "golden" ? "golden" : "regular",
    })
    .eq("id", str(formData, "id"));
  revalidatePath(`/admin/licoes/${str(formData, "lesson_id")}`);
}

export async function deletePart(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("parts").delete().eq("id", str(formData, "id"));
  revalidatePath(`/admin/licoes/${str(formData, "lesson_id")}`);
}

export async function movePart(formData: FormData) {
  const { supabase } = await requireAdmin();
  await reorder(supabase, "parts", "lesson_id", str(formData, "lesson_id"), str(formData, "id"), str(formData, "dir") as "up" | "down");
  revalidatePath(`/admin/licoes/${str(formData, "lesson_id")}`);
}

// ====================================================================
// Blocos
// ====================================================================
function buildBlockData(type: string, formData: FormData): {
  data: Record<string, unknown>;
  solution: Record<string, unknown> | null;
} {
  const lines = (key: string) =>
    str(formData, key)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  switch (type) {
    case "rich_text":
      return { data: { text: str(formData, "text") }, solution: null };
    case "reading_tts":
      return {
        data: { title: str(formData, "title") || undefined, text: str(formData, "text") },
        solution: null,
      };
    case "pronunciation":
      return {
        data: { title: str(formData, "title") || undefined, items: lines("items") },
        solution: null,
      };
    case "vocabulary":
      return {
        data: {
          items: lines("items").map((line) => {
            const [term, translation, example] = line.split("|").map((s) => s.trim());
            return { term: term ?? "", translation: translation ?? "", ...(example ? { example } : {}) };
          }),
        },
        solution: null,
      };
    case "dialogue_tts":
      return {
        data: {
          lines: lines("lines").map((line) => {
            const i = line.indexOf(":");
            const speaker = i >= 0 ? line.slice(0, i).trim() : "";
            const text = i >= 0 ? line.slice(i + 1).trim() : line;
            return { speaker, text };
          }),
        },
        solution: null,
      };
    case "multiple_choice":
      return {
        data: { question: str(formData, "question"), options: lines("options") },
        solution: { answerIndex: Number(str(formData, "answerIndex") || "0") },
      };
    case "fill_blank": {
      const alternatives = str(formData, "alternatives")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        data: { prompt: str(formData, "prompt") },
        solution: { answer: str(formData, "answer"), ...(alternatives.length ? { alternatives } : {}) },
      };
    }
    default:
      return { data: {}, solution: null };
  }
}

export async function createBlock(formData: FormData) {
  const { supabase } = await requireAdmin();
  const partId = str(formData, "part_id");
  const type = str(formData, "type");
  const { data: part } = await supabase
    .from("parts")
    .select("lesson_id, course_id")
    .eq("id", partId)
    .single();
  if (!part) return;
  const { data: blockData, solution } = buildBlockData(type, formData);
  const position = await nextPosition(supabase, "blocks", "part_id", partId);
  const { data: block } = await supabase
    .from("blocks")
    .insert({
      part_id: partId,
      lesson_id: part.lesson_id,
      course_id: part.course_id,
      type,
      data: blockData as never,
      position,
    })
    .select("id")
    .single();
  if (block && solution) {
    await supabase
      .from("exercise_solutions")
      .upsert({ block_id: block.id, course_id: part.course_id, solution: solution as never });
  }
  revalidatePath(`/admin/partes/${partId}`);
}

export async function updateBlock(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const partId = str(formData, "part_id");
  const courseId = str(formData, "course_id");
  const type = str(formData, "type");
  const { data: blockData, solution } = buildBlockData(type, formData);
  await supabase.from("blocks").update({ data: blockData as never }).eq("id", id);
  if (solution) {
    await supabase
      .from("exercise_solutions")
      .upsert({ block_id: id, course_id: courseId, solution: solution as never });
  }
  revalidatePath(`/admin/partes/${partId}`);
}

export async function deleteBlock(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("blocks").delete().eq("id", str(formData, "id"));
  revalidatePath(`/admin/partes/${str(formData, "part_id")}`);
}

export async function moveBlock(formData: FormData) {
  const { supabase } = await requireAdmin();
  const partId = str(formData, "part_id");
  await reorder(supabase, "blocks", "part_id", partId, str(formData, "id"), str(formData, "dir") as "up" | "down");
  revalidatePath(`/admin/partes/${partId}`);
}

// ====================================================================
// Matrículas
// ====================================================================
export async function enrollStudent(
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const { supabase } = await requireAdmin();
  const courseId = str(formData, "course_id");
  const email = str(formData, "email").toLowerCase();
  if (!email) return { error: "Informe o e-mail.", notice: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (!profile) {
    return {
      error: "Nenhum aluno com esse e-mail. Peça para a pessoa se cadastrar primeiro.",
      notice: null,
    };
  }

  const { error } = await supabase
    .from("enrollments")
    .upsert(
      { user_id: profile.id, course_id: courseId, status: "active" },
      { onConflict: "user_id,course_id" },
    );
  if (error) return { error: "Não foi possível matricular.", notice: null };

  revalidatePath(`/admin/cursos/${courseId}/matriculas`);
  return { error: null, notice: `Aluno matriculado: ${email}` };
}

export async function unenrollStudent(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("enrollments").delete().eq("id", str(formData, "id"));
  revalidatePath(`/admin/cursos/${str(formData, "course_id")}/matriculas`);
}

// Gera uma senha curta e legível (sem ambiguidades). Mostrada uma única vez.
function generatePassword(): string {
  const token = randomBytes(6).toString("base64").replace(/[+/=lI0O]/g, "");
  return `aluno-${token.slice(0, 8)}`;
}

// Cria conta de aluno já confirmada (login imediato). Decoupled de curso: a
// matrícula acontece em /admin/cursos/[id]/matriculas. As credenciais voltam
// no estado para o admin entregar ao aluno.
export async function createStudent(
  _prev: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  const fullName = str(formData, "full_name");

  if (!email || !fullName) {
    return {
      error: "Informe nome e e-mail.",
      notice: null,
      credentials: null,
    };
  }

  const typedPassword = str(formData, "password");
  if (typedPassword.length > 0 && typedPassword.length < 8) {
    return {
      error: "A senha precisa ter ao menos 8 caracteres.",
      notice: null,
      credentials: null,
    };
  }
  const password = typedPassword || generatePassword();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error: "Já existe uma conta com esse e-mail.",
        notice: null,
        credentials: null,
      };
    }
    return {
      error: `Não foi possível criar a conta: ${error.message}`,
      notice: null,
      credentials: null,
    };
  }

  // O trigger handle_new_user já criou o profile com role=student e full_name.
  revalidatePath("/admin/alunos");
  return {
    error: null,
    notice: "Aluno criado.",
    credentials: { email, password },
  };
}
