// Edge Function: tts (ADR 0003)
// Gera o MP3 de (texto + voz) uma vez via Google Cloud Text-to-Speech, salva no
// Storage (bucket tts-audio) e serve do cache nas próximas chamadas.
//
// Autenticação: verify_jwt = true (só usuários logados chamam). A chamada ao
// Google usa uma API key restrita à API de TTS (secret GOOGLE_TTS_API_KEY).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "tts-audio";
const MAX_TEXT = 5000;

// Vozes Neural2 por idioma.
const VOICE_BY_LANG: Record<string, { languageCode: string; name: string }> = {
  en: { languageCode: "en-US", name: "en-US-Neural2-C" },
  es: { languageCode: "es-US", name: "es-US-Neural2-A" },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { text?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const lang = (typeof body.lang === "string" ? body.lang : "en").slice(0, 2);
  if (!text) return json({ error: "Texto ausente" }, 400);
  if (text.length > MAX_TEXT) return json({ error: "Texto muito longo" }, 400);

  const voice = VOICE_BY_LANG[lang] ?? VOICE_BY_LANG.en;
  const cacheKey = await sha256Hex(`${voice.languageCode}|${voice.name}|${text}`);
  const path = `${cacheKey}.mp3`;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Cache hit?
  const head = await fetch(publicUrl, { method: "HEAD" });
  if (head.ok) return json({ url: publicUrl, cached: true });

  // Cache miss -> gera no Google TTS.
  const apiKey = Deno.env.get("GOOGLE_TTS_API_KEY");
  if (!apiKey) {
    return json(
      { error: "TTS não configurado: defina o secret GOOGLE_TTS_API_KEY." },
      503,
    );
  }

  const ttsRes = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.languageCode, name: voice.name },
        audioConfig: { audioEncoding: "MP3" },
      }),
    },
  );

  if (!ttsRes.ok) {
    const detail = (await ttsRes.text()).slice(0, 300);
    return json({ error: "Falha no Google TTS", detail }, 502);
  }

  const { audioContent } = await ttsRes.json();
  const bytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
  if (upErr) return json({ error: "Falha ao salvar áudio", detail: upErr.message }, 500);

  return json({ url: publicUrl, cached: false });
});
