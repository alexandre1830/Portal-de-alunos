// Catálogo de vozes Neural2 do Google Cloud TTS disponíveis no portal.
// IMPORTANTE: a Edge Function `tts` precisa ter o MESMO catálogo (duplicado lá,
// pois o runtime é Deno e não pode importar daqui). Manter ambos em sincronia.

export interface VoiceOption {
  id: string; // ex.: "en-US-Neural2-F"
  language: "en" | "es";
  languageCode: string; // ex.: "en-US", "en-GB"
  accent: string;
  gender: "female" | "male";
  label: string;
  example: string; // frase tocada no botão de "ouvir"
}

const EXAMPLE_EN = "Hello! My name is John. Nice to meet you.";
const EXAMPLE_ES = "Hola, me llamo Juan. Mucho gusto.";

export const VOICES: VoiceOption[] = [
  // Inglês
  {
    id: "en-US-Neural2-F",
    language: "en",
    languageCode: "en-US",
    accent: "Americano (EUA)",
    gender: "female",
    label: "Inglês — Americano · Feminino",
    example: EXAMPLE_EN,
  },
  {
    id: "en-US-Neural2-D",
    language: "en",
    languageCode: "en-US",
    accent: "Americano (EUA)",
    gender: "male",
    label: "Inglês — Americano · Masculino",
    example: EXAMPLE_EN,
  },
  {
    id: "en-GB-Neural2-A",
    language: "en",
    languageCode: "en-GB",
    accent: "Britânico (Reino Unido)",
    gender: "female",
    label: "Inglês — Britânico · Feminino",
    example: EXAMPLE_EN,
  },
  {
    id: "en-GB-Neural2-B",
    language: "en",
    languageCode: "en-GB",
    accent: "Britânico (Reino Unido)",
    gender: "male",
    label: "Inglês — Britânico · Masculino",
    example: EXAMPLE_EN,
  },
  {
    id: "en-AU-Neural2-A",
    language: "en",
    languageCode: "en-AU",
    accent: "Australiano",
    gender: "female",
    label: "Inglês — Australiano · Feminino",
    example: EXAMPLE_EN,
  },
  {
    id: "en-AU-Neural2-B",
    language: "en",
    languageCode: "en-AU",
    accent: "Australiano",
    gender: "male",
    label: "Inglês — Australiano · Masculino",
    example: EXAMPLE_EN,
  },
  // Espanhol
  {
    id: "es-US-Neural2-A",
    language: "es",
    languageCode: "es-US",
    accent: "Latino-americano",
    gender: "female",
    label: "Espanhol — Latino · Feminino",
    example: EXAMPLE_ES,
  },
  {
    id: "es-US-Neural2-B",
    language: "es",
    languageCode: "es-US",
    accent: "Latino-americano",
    gender: "male",
    label: "Espanhol — Latino · Masculino",
    example: EXAMPLE_ES,
  },
  {
    id: "es-ES-Neural2-A",
    language: "es",
    languageCode: "es-ES",
    accent: "Europeu (Espanha)",
    gender: "female",
    label: "Espanhol — Europeu · Feminino",
    example: EXAMPLE_ES,
  },
  {
    id: "es-ES-Neural2-B",
    language: "es",
    languageCode: "es-ES",
    accent: "Europeu (Espanha)",
    gender: "male",
    label: "Espanhol — Europeu · Masculino",
    example: EXAMPLE_ES,
  },
];

export const VOICES_BY_LANG = {
  en: VOICES.filter((v) => v.language === "en"),
  es: VOICES.filter((v) => v.language === "es"),
};

export const DEFAULT_VOICE: Record<"en" | "es", string> = {
  en: "en-US-Neural2-F",
  es: "es-US-Neural2-A",
};

export const DEFAULT_RATE = 0.8;
export const MIN_RATE = 0.6;
export const MAX_RATE = 1.2;
export const RATE_STEP = 0.05;

const IDS = new Set(VOICES.map((v) => v.id));
export function isValidVoiceId(id: string): boolean {
  return IDS.has(id);
}
