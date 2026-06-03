import { DialogueBlock } from "@/components/blocks/DialogueBlock";
import { ReadingBlock } from "@/components/blocks/ReadingBlock";
import { RichTextBlock } from "@/components/blocks/RichTextBlock";
import { VocabularyBlock } from "@/components/blocks/VocabularyBlock";
import {
  dialogueData,
  fillBlankData,
  multipleChoiceData,
  readingData,
  richTextData,
  vocabularyData,
} from "@/lib/blocks/schemas";
import type { Block } from "@/types/content";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border-primary px-3 py-2 text-sm text-fg-tertiary">
      {children}
    </p>
  );
}

// Renderiza um bloco a partir de seu `type` + `data`. Faz o parse com o schema
// específico de cada tipo (type-safe) e, se o conteúdo for inválido, mostra um
// aviso em vez de quebrar a página.
export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "rich_text": {
      const parsed = richTextData.safeParse(block.data);
      return parsed.success ? (
        <RichTextBlock data={parsed.data} />
      ) : (
        <Notice>Bloco de texto inválido.</Notice>
      );
    }
    case "vocabulary": {
      const parsed = vocabularyData.safeParse(block.data);
      return parsed.success ? (
        <VocabularyBlock data={parsed.data} />
      ) : (
        <Notice>Bloco de vocabulário inválido.</Notice>
      );
    }
    case "reading_tts": {
      const parsed = readingData.safeParse(block.data);
      return parsed.success ? (
        <ReadingBlock data={parsed.data} />
      ) : (
        <Notice>Bloco de leitura inválido.</Notice>
      );
    }
    case "dialogue_tts": {
      const parsed = dialogueData.safeParse(block.data);
      return parsed.success ? (
        <DialogueBlock data={parsed.data} />
      ) : (
        <Notice>Bloco de diálogo inválido.</Notice>
      );
    }
    case "multiple_choice": {
      const parsed = multipleChoiceData.safeParse(block.data);
      // Exercício interativo + correção chegam no passo seguinte.
      return parsed.success ? (
        <Notice>Exercício (múltipla escolha) — em breve.</Notice>
      ) : (
        <Notice>Exercício inválido.</Notice>
      );
    }
    case "fill_blank": {
      const parsed = fillBlankData.safeParse(block.data);
      return parsed.success ? (
        <Notice>Exercício (preencher lacuna) — em breve.</Notice>
      ) : (
        <Notice>Exercício inválido.</Notice>
      );
    }
    default:
      return <Notice>Tipo de bloco não suportado: {block.type}.</Notice>;
  }
}
