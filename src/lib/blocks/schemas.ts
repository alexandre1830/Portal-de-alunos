import { z } from "zod";

// Formatos do campo `data` (JSONB) de cada tipo de bloco. O DB guarda `type`
// (text) + `data` (jsonb); aqui validamos/pareamos por tipo. Conteúdo
// malformado é tratado como inválido pelo renderizador (não quebra a página).
//
// IMPORTANTE: nos exercícios, o gabarito (answerIndex/answer) vive aqui e é
// lido APENAS no servidor (correção). Ao renderizar, só os campos públicos
// vão para o cliente — ver toPublicExercise abaixo.

// --- Blocos de conteúdo ---
export const richTextData = z.object({
  text: z.string(),
});

export const vocabularyData = z.object({
  items: z
    .array(
      z.object({
        term: z.string(),
        translation: z.string(),
        example: z.string().optional(),
      }),
    )
    .min(1),
});

export const readingData = z.object({
  title: z.string().optional(),
  text: z.string(),
});

export const dialogueData = z.object({
  lines: z
    .array(z.object({ speaker: z.string(), text: z.string() }))
    .min(1),
});

// Prática de pronúncia: lista de frases, cada uma com seu próprio áudio.
export const pronunciationData = z.object({
  title: z.string().optional(),
  items: z.array(z.string()).min(1),
});

// --- Blocos de exercício (dados PÚBLICOS — sem gabarito) ---
// O gabarito vive em exercise_solutions (fora do alcance do aluno).
export const multipleChoiceData = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
});

export const fillBlankData = z.object({
  prompt: z.string(),
});

// --- Gabaritos (lidos só no servidor, via service_role) ---
export const multipleChoiceSolution = z.object({
  answerIndex: z.number().int().nonnegative(),
});

export const fillBlankSolution = z.object({
  // Resposta canônica + variações aceitas. Typos toleráveis via Levenshtein
  // na correção (ADR 0006).
  answer: z.string().min(1),
  alternatives: z.array(z.string()).optional(),
});

export type MultipleChoiceSolution = z.infer<typeof multipleChoiceSolution>;
export type FillBlankSolution = z.infer<typeof fillBlankSolution>;

export type RichTextData = z.infer<typeof richTextData>;
export type VocabularyData = z.infer<typeof vocabularyData>;
export type ReadingData = z.infer<typeof readingData>;
export type DialogueData = z.infer<typeof dialogueData>;
export type PronunciationData = z.infer<typeof pronunciationData>;
export type MultipleChoiceData = z.infer<typeof multipleChoiceData>;
export type FillBlankData = z.infer<typeof fillBlankData>;

export const BLOCK_SCHEMAS = {
  rich_text: richTextData,
  vocabulary: vocabularyData,
  reading_tts: readingData,
  dialogue_tts: dialogueData,
  pronunciation: pronunciationData,
  multiple_choice: multipleChoiceData,
  fill_blank: fillBlankData,
} as const;

export type BlockType = keyof typeof BLOCK_SCHEMAS;

export const EXERCISE_TYPES: BlockType[] = ["multiple_choice", "fill_blank"];

export function isExerciseType(type: string): boolean {
  return (EXERCISE_TYPES as string[]).includes(type);
}
