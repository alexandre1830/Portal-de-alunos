// Edge Function: tts (ADR 0003)
// Gera o áudio de um trecho (texto ou diálogo) via Google Cloud Text-to-Speech,
// salva no Storage (bucket tts-audio) e serve do cache nas próximas chamadas.
//
// Corrige para alunos iniciantes:
//  - speakingRate lento (RATE) — A1 precisa de áudio devagar.
//  - diálogo: cada personagem ganha uma voz diferente (sintetiza linha a linha
//    e concatena os MP3).
//  - limpeza do texto: setas viram pausa, emojis/símbolos são removidos (para
//    a voz não ler "right pointing arrow" etc.).
//
// Auth: verify_jwt = true. Google via API key (secret GOOGLE_TTS_API_KEY).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "tts-audio";
const MAX_TEXT = 8000;
const RATE = 0.8; // velocidade de fala (1.0 = normal). A1 -> mais devagar.

// Pool de vozes Neural2 por idioma (a 1ª é a padrão; no diálogo, alterna por
// personagem). C = feminina, D = masculina.
const VOICES: Record<string, { languageCode: string; names: string[] }> = {
  en: { languageCode: "en-US", names: ["en-US-Neural2-C", "en-US-Neural2-D", "en-US-Neural2-A"] },
  es: { languageCode: "es-US", names: ["es-US-Neural2-A", "es-US-Neural2-B", "es-US-Neural2-C"] },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Remove símbolos que a voz leria em voz alta. Setas viram pausa (vírgula).
function clean(input: string): string {
  return input
    .replace(/[→➔➜⇒↦➝]/g, ", ")
    .replace(/[•·▪◦‣■●◆❖➢✅✔☑⚠✍✎♦★☆🔊🏆😀-🿿]/gu, " ")
    .replace(/[ \t]*\n[ \t]*/g, ", ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/(,\s*){2,}/g, ", ")
    .trim();
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function synthesize(
  apiKey: string,
  text: string,
  languageCode: string,
  name: string,
): Promise<Uint8Array> {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name },
        audioConfig: { audioEncoding: "MP3", speakingRate: RATE },
      }),
    },
  );
  if (!res.ok) throw new Error((await res.text()).slice(0, 300));
  const { audioContent } = await res.json();
  return Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
}

interface Segment {
  text: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { text?: unknown; lines?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const lang = (typeof body.lang === "string" ? body.lang : "en").slice(0, 2);
  const voiceSet = VOICES[lang] ?? VOICES.en;
  const { languageCode, names } = voiceSet;

  // Monta os segmentos (cada um com seu texto limpo e voz).
  const segments: Segment[] = [];

  if (Array.isArray(body.lines)) {
    // Diálogo: uma voz por personagem (ordem de aparição).
    const speakerVoice = new Map<string, string>();
    for (const raw of body.lines) {
      if (!raw || typeof raw !== "object") continue;
      const speaker = String((raw as { speaker?: unknown }).speaker ?? "");
      const lineText = clean(String((raw as { text?: unknown }).text ?? ""));
      if (!lineText) continue;
      if (!speakerVoice.has(speaker)) {
        speakerVoice.set(speaker, names[speakerVoice.size % names.length]!);
      }
      segments.push({ text: lineText, name: speakerVoice.get(speaker)! });
    }
  } else {
    const text = clean(typeof body.text === "string" ? body.text : "");
    if (text) segments.push({ text, name: names[0]! });
  }

  if (segments.length === 0) return json({ error: "Nada para falar" }, 400);
  const totalLen = segments.reduce((n, s) => n + s.text.length, 0);
  if (totalLen > MAX_TEXT) return json({ error: "Texto muito longo" }, 400);

  // Chave de cache: depende de idioma, rate, vozes e textos limpos.
  const spec = JSON.stringify({ languageCode, rate: RATE, segments });
  const path = `${await sha256Hex(spec)}.mp3`;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const head = await fetch(publicUrl, { method: "HEAD" });
  if (head.ok) return json({ url: publicUrl, cached: true });

  const apiKey = Deno.env.get("GOOGLE_TTS_API_KEY");
  if (!apiKey) {
    return json({ error: "TTS nao configurado: defina o secret GOOGLE_TTS_API_KEY." }, 503);
  }

  // Sintetiza cada segmento e concatena os MP3.
  let parts: Uint8Array[];
  try {
    parts = await Promise.all(
      segments.map((s) => synthesize(apiKey, s.text, languageCode, s.name)),
    );
  } catch (e) {
    return json({ error: "Falha no Google TTS", detail: String(e).slice(0, 300) }, 502);
  }

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, out, { contentType: "audio/mpeg", upsert: true });
  if (upErr) return json({ error: "Falha ao salvar audio", detail: upErr.message }, 500);

  return json({ url: publicUrl, cached: false });
});
