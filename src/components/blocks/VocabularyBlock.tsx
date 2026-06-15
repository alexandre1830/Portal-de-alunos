import { SpeakButton } from "@/components/blocks/SpeakButton";
import type { TtsOverride } from "@/components/blocks/BlockRenderer";
import type { VocabularyData } from "@/lib/blocks/schemas";

// Lista de vocabulário com botão de áudio por termo. O áudio sai da
// Edge Function `tts` (cache no Storage), mesma trilha de Reading/
// Pronunciation/Dialogue — ver SpeakButton + ADR 0003.
//
// `tts` carrega lang/voice/rate do preset do curso/aluno. Sem ele,
// caímos pra inglês por default (na prática o BlockRenderer sempre
// passa o do curso).
export function VocabularyBlock({
  data,
  tts,
}: {
  data: VocabularyData;
  tts?: TtsOverride;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border-primary">
      {data.items.map((item, i) => (
        <li key={i} className="flex flex-col gap-0.5 py-2">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-fg-primary">{item.term}</span>
              <SpeakButton
                iconOnly
                label={`Ouvir "${item.term}"`}
                body={{
                  text: item.term,
                  lang: tts?.lang ?? "en",
                  ...(tts?.voice ? { voice: tts.voice } : {}),
                  ...(tts?.rate ? { rate: tts.rate } : {}),
                }}
              />
            </div>
            <span className="text-sm text-fg-secondary">
              {item.translation}
            </span>
          </div>
          {item.example && (
            <span className="text-sm italic text-fg-tertiary">
              {item.example}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
