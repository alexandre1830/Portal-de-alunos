// Edge Function: tts (ADR 0003)
// Gera o áudio de um trecho (texto ou diálogo) via Google Cloud Text-to-Speech,
// salva no Storage (bucket tts-audio) e serve do cache nas próximas chamadas.
//
// Para alunos iniciantes:
//  - speakingRate lento (RATE_DEFAULT) — A1 precisa de áudio devagar.
//  - diálogo: cada personagem ganha uma voz com o gênero inferido do nome, e
//    vozes distintas mesmo entre personagens do mesmo gênero. Voice/rate
//    enviados pelo cliente são IGNORADOS em diálogos.
//  - texto único / pronúncia: aceita override `voice` e `rate` (preferências
//    do aluno). Validados contra whitelist; senão usa default por idioma.
//  - limpeza do texto: setas viram pausa, emojis/símbolos são removidos.
//
// Auth: verify_jwt = true. Google via API key (secret GOOGLE_TTS_API_KEY).
// IMPORTANTE: o catálogo aqui deve espelhar src/lib/tts/voices.ts.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "tts-audio";
const MAX_TEXT = 8000;
const RATE_DEFAULT = 0.8;
const RATE_MIN = 0.6;
const RATE_MAX = 1.2;

// Catálogo de vozes aprovadas. Quando o aluno envia `voice`, validamos por id
// e pelo prefixo do languageCode (en-... só lê inglês, etc).
const ALLOWED_VOICES: Record<string, string> = {
  // Inglês — preferências do aluno
  "en-US-Neural2-F": "en-US",
  "en-US-Neural2-D": "en-US",
  "en-GB-Neural2-A": "en-GB",
  "en-GB-Neural2-B": "en-GB",
  "en-AU-Neural2-A": "en-AU",
  "en-AU-Neural2-B": "en-AU",
  // Espanhol — preferências do aluno
  "es-US-Neural2-A": "es-US",
  "es-US-Neural2-B": "es-US",
  "es-ES-Neural2-A": "es-ES",
  "es-ES-Neural2-B": "es-ES",
  // Vozes do pool de diálogo (mantidas para compat com o cache antigo)
  "en-US-Neural2-C": "en-US",
  "en-US-Neural2-G": "en-US",
  "en-US-Neural2-H": "en-US",
  "en-US-Neural2-A": "en-US",
  "en-US-Neural2-I": "en-US",
  "en-US-Neural2-J": "en-US",
  "es-US-Neural2-C": "es-US",
};

const DEFAULT_VOICE_FOR_LANG: Record<string, string> = {
  en: "en-US-Neural2-F",
  es: "es-US-Neural2-A",
};

// Pool de vozes Neural2 por idioma e gênero para diálogos.
const DIALOG_VOICES: Record<
  string,
  { languageCode: string; female: string[]; male: string[] }
> = {
  en: {
    languageCode: "en-US",
    female: ["en-US-Neural2-C", "en-US-Neural2-F", "en-US-Neural2-G", "en-US-Neural2-H"],
    male: ["en-US-Neural2-D", "en-US-Neural2-A", "en-US-Neural2-I", "en-US-Neural2-J"],
  },
  es: {
    languageCode: "es-US",
    female: ["es-US-Neural2-A"],
    male: ["es-US-Neural2-B", "es-US-Neural2-C"],
  },
};

const NAME_GENDER: Record<string, "m" | "f"> = {
  john: "m", connor: "m", pedro: "m", mike: "m", leo: "m", nigel: "m",
  peter: "m", caleb: "m", renan: "m", sanjay: "m", sean: "m", brown: "m",
  carlos: "m", miguel: "m", theo: "m", david: "m", mark: "m", james: "m",
  robert: "m", paul: "m", tom: "m", jack: "m",
  sarah: "f", emma: "f", laura: "f", pauline: "f", maria: "f", julia: "f",
  ana: "f", annie: "f", anna: "f", sophia: "f", olivia: "f", mary: "f",
  jane: "f", sandra: "f", emily: "f", grace: "f",
};

function inferGender(speaker: string): "m" | "f" | null {
  const s = speaker.toLowerCase();
  if (/\b(mrs|ms|miss)\b/.test(s)) return "f";
  if (/\bmr\b\.?/.test(s)) return "m";
  const token = (s.match(/[a-zà-ú]+/) ?? [""])[0]!;
  return NAME_GENDER[token] ?? null;
}

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

function clampRate(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return RATE_DEFAULT;
  if (n < RATE_MIN) return RATE_MIN;
  if (n > RATE_MAX) return RATE_MAX;
  return n;
}

// Valida a voz solicitada pelo cliente: precisa estar no catálogo e seu
// languageCode precisa começar pelo idioma do request (en-* p/ "en").
function pickVoice(requested: unknown, lang: string): string {
  const fallback = DEFAULT_VOICE_FOR_LANG[lang] ?? DEFAULT_VOICE_FOR_LANG.en;
  if (typeof requested !== "string") return fallback;
  const code = ALLOWED_VOICES[requested];
  if (!code) return fallback;
  if (!code.startsWith(`${lang}-`)) return fallback;
  return requested;
}

async function synthesize(
  apiKey: string,
  text: string,
  languageCode: string,
  name: string,
  rate: number,
): Promise<Uint8Array> {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name },
        audioConfig: { audioEncoding: "MP3", speakingRate: rate },
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
  languageCode: string;
  rate: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: {
    text?: unknown;
    lines?: unknown;
    lang?: unknown;
    voice?: unknown;
    rate?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const lang = (typeof body.lang === "string" ? body.lang : "en")
    .slice(0, 2)
    .toLowerCase();

  const segments: Segment[] = [];

  if (Array.isArray(body.lines)) {
    // Diálogo: voz por personagem, gênero inferido, rate padrão. IGNORA
    // voice/rate enviados pelo cliente.
    const pool = DIALOG_VOICES[lang] ?? DIALOG_VOICES.en;
    const { languageCode, female, male } = pool;
    const speakerVoice = new Map<string, string>();
    let fi = 0;
    let mi = 0;
    const voiceFor = (speaker: string): string => {
      const existing = speakerVoice.get(speaker);
      if (existing) return existing;
      const g = inferGender(speaker);
      let v: string;
      if (g === "f") v = female[fi++ % female.length]!;
      else if (g === "m") v = male[mi++ % male.length]!;
      else if (fi <= mi) v = female[fi++ % female.length]!;
      else v = male[mi++ % male.length]!;
      speakerVoice.set(speaker, v);
      return v;
    };

    for (const raw of body.lines) {
      if (!raw || typeof raw !== "object") continue;
      const speaker = String((raw as { speaker?: unknown }).speaker ?? "");
      const lineText = clean(String((raw as { text?: unknown }).text ?? ""));
      if (!lineText) continue;
      segments.push({
        text: lineText,
        name: voiceFor(speaker),
        languageCode,
        rate: RATE_DEFAULT,
      });
    }
  } else {
    // Texto único / pronúncia: usa override do cliente quando válido.
    const text = clean(typeof body.text === "string" ? body.text : "");
    if (text) {
      const voice = pickVoice(body.voice, lang);
      const languageCode = ALLOWED_VOICES[voice]!;
      const rate = body.rate === undefined ? RATE_DEFAULT : clampRate(body.rate);
      segments.push({ text, name: voice, languageCode, rate });
    }
  }

  if (segments.length === 0) return json({ error: "Nada para falar" }, 400);
  const totalLen = segments.reduce((n, s) => n + s.text.length, 0);
  if (totalLen > MAX_TEXT) return json({ error: "Texto muito longo" }, 400);

  // Chave de cache: depende de idioma, vozes, rates e textos limpos.
  const spec = JSON.stringify({ lang, segments });
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

  let parts: Uint8Array[];
  try {
    parts = await Promise.all(
      segments.map((s) =>
        synthesize(apiKey, s.text, s.languageCode, s.name, s.rate),
      ),
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
