"use server";

import { requireAdmin } from "@/lib/admin/guard";

export interface LessonImageUploadResult {
  ok: boolean;
  url: string | null;
  error: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — material de lição costuma ser
// recorte de PDF/screenshot; 5 MB dá folga sem virar abuso.

// Também serve de whitelist: mime fora deste mapa é rejeitado. A extensão
// vem daqui (nunca do nome do arquivo enviado).
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Upload de imagem de bloco para o bucket `lesson-images`.
// Path: <course_id>/<timestamp>-<rand>.<ext> — nome derivado do mime (nunca
// do nome original enviado) e único por upload, então trocar a imagem de um
// bloco não invalida a de outro nem exige cache-busting.
//
// Só admin: requireAdmin() barra no app e a policy RLS
// `lesson_images_admin_insert` barra no banco (defesa em profundidade).
export async function uploadLessonImage(
  formData: FormData,
): Promise<LessonImageUploadResult> {
  const { supabase } = await requireAdmin();

  const courseId = String(formData.get("course_id") ?? "");
  if (!courseId) {
    return { ok: false, url: null, error: "Curso não identificado." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, url: null, error: "Selecione uma imagem." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, url: null, error: "Imagem muito grande. O limite é 5 MB." };
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return {
      ok: false,
      url: null,
      error: "Formato não suportado. Use PNG, JPG, WEBP ou GIF.",
    };
  }

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${courseId}/${unique}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("lesson-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (uploadErr) {
    return { ok: false, url: null, error: `Falha no upload: ${uploadErr.message}` };
  }

  const { data } = supabase.storage.from("lesson-images").getPublicUrl(path);
  return { ok: true, url: data.publicUrl, error: null };
}
