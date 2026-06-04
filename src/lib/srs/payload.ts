// Payloads serializados no campo srs_items.payload. Tipados aqui para que
// a UI de revisão e os upserts compartilhem o mesmo formato.

export interface SrsExercisePayload {
  type: "exercise";
  kind: "multiple_choice" | "fill_blank";
  question: string;
  answer: string;
  partTitle?: string;
  courseTitle?: string;
}

export interface SrsVocabPayload {
  type: "vocab";
  term: string;
  translation: string;
  example?: string;
  partTitle?: string;
  courseTitle?: string;
}

export type SrsPayload = SrsExercisePayload | SrsVocabPayload;
