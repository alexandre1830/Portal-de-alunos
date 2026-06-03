import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  Course,
  Lesson,
  Module,
  Part,
  PartProgress,
} from "@/types/content";

type Client = SupabaseClient<Database>;

export interface PartNode extends Part {
  progress: PartProgress | null;
}
export interface LessonNode extends Lesson {
  parts: PartNode[];
}
export interface ModuleNode extends Module {
  lessons: LessonNode[];
}
export interface CourseStructure {
  course: Course;
  modules: ModuleNode[];
}

function groupBy<T, K extends string>(rows: T[], key: (row: T) => K) {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);
    else map.set(k, [row]);
  }
  return map;
}

// Monta a árvore module -> lesson -> part do curso (por slug), anexando o
// progresso do aluno em cada parte. A RLS garante que só vêm itens visíveis
// (matriculado + publicado, ou staff).
export async function getCourseStructure(
  supabase: Client,
  userId: string,
  slug: string,
): Promise<CourseStructure | null> {
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!course) return null;

  const [modulesRes, lessonsRes, partsRes, progressRes] = await Promise.all([
    supabase
      .from("modules")
      .select("*")
      .eq("course_id", course.id)
      .order("position"),
    supabase
      .from("lessons")
      .select("*")
      .eq("course_id", course.id)
      .order("position"),
    supabase
      .from("parts")
      .select("*")
      .eq("course_id", course.id)
      .order("position"),
    supabase
      .from("part_progress")
      .select("*")
      .eq("course_id", course.id)
      .eq("user_id", userId),
  ]);

  const modules: Module[] = modulesRes.data ?? [];
  const lessons: Lesson[] = lessonsRes.data ?? [];
  const parts: Part[] = partsRes.data ?? [];
  const progress: PartProgress[] = progressRes.data ?? [];

  const progressByPart = new Map(progress.map((p) => [p.part_id, p]));
  const partsByLesson = groupBy(parts, (p) => p.lesson_id);
  const lessonsByModule = groupBy(lessons, (l) => l.module_id);

  const moduleNodes: ModuleNode[] = modules.map((module) => ({
    ...module,
    lessons: (lessonsByModule.get(module.id) ?? []).map((lesson) => ({
      ...lesson,
      parts: (partsByLesson.get(lesson.id) ?? []).map((part) => ({
        ...part,
        progress: progressByPart.get(part.id) ?? null,
      })),
    })),
  }));

  return { course, modules: moduleNodes };
}
