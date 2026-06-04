"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { PreferencesState } from "@/lib/preferences/types";
import {
  DEFAULT_RATE,
  DEFAULT_VOICE,
  isValidVoiceId,
  MAX_RATE,
  MIN_RATE,
} from "@/lib/tts/voices";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  tts_voice_en: z.string().refine(isValidVoiceId, "Voz de inglês inválida."),
  tts_voice_es: z.string().refine(isValidVoiceId, "Voz de espanhol inválida."),
  tts_rate: z.coerce.number().min(MIN_RATE).max(MAX_RATE),
});

export async function savePreferences(
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = schema.safeParse({
    tts_voice_en: formData.get("tts_voice_en") ?? DEFAULT_VOICE.en,
    tts_voice_es: formData.get("tts_voice_es") ?? DEFAULT_VOICE.es,
    tts_rate: formData.get("tts_rate") ?? DEFAULT_RATE,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Entrada inválida.",
      notice: null,
    };
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      tts_voice_en: parsed.data.tts_voice_en,
      tts_voice_es: parsed.data.tts_voice_es,
      tts_rate: parsed.data.tts_rate,
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: "Não foi possível salvar.", notice: null };

  revalidatePath("/painel/configuracoes");
  // Invalida páginas que usam TTS com base nas prefs.
  revalidatePath("/partes", "layout");
  return { error: null, notice: "Configurações salvas." };
}
