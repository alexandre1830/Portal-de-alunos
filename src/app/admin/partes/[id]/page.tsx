import Link from "next/link";
import { notFound } from "next/navigation";

import { BlockForm, type BlockInitial } from "@/components/admin/BlockForm";
import { ArrowDownIcon } from "@/components/icons/ArrowDownIcon";
import { ArrowUpIcon } from "@/components/icons/ArrowUpIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { BackLink } from "@/components/shared/BackLink";
import { ConfirmForm } from "@/components/shared/ConfirmForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deleteBlock, moveBlock } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";
import {
  dialogueData,
  fillBlankData,
  fillBlankSolution,
  isExerciseType,
  multipleChoiceData,
  multipleChoiceSolution,
  errorCorrectionData,
  errorCorrectionSolution,
  pronunciationData,
  readingData,
  reorderWordsData,
  richTextData,
  speakingData,
  translationData,
  translationSolution,
  vocabularyData,
} from "@/lib/blocks/schemas";

function toInitial(
  type: string,
  data: unknown,
  solution: unknown,
): BlockInitial {
  switch (type) {
    case "rich_text": {
      const p = richTextData.safeParse(data);
      return { text: p.success ? p.data.text : "" };
    }
    case "reading_tts": {
      const p = readingData.safeParse(data);
      return p.success ? { title: p.data.title ?? "", text: p.data.text } : {};
    }
    case "pronunciation": {
      const p = pronunciationData.safeParse(data);
      return p.success
        ? { title: p.data.title ?? "", items: p.data.items.join("\n") }
        : {};
    }
    case "speaking": {
      const p = speakingData.safeParse(data);
      return p.success
        ? { title: p.data.title ?? "", items: p.data.items.join("\n") }
        : {};
    }
    case "vocabulary": {
      const p = vocabularyData.safeParse(data);
      return p.success
        ? {
            items: p.data.items
              .map((it) => [it.term, it.translation, it.example].filter(Boolean).join(" | "))
              .join("\n"),
          }
        : {};
    }
    case "dialogue_tts": {
      const p = dialogueData.safeParse(data);
      return p.success
        ? { lines: p.data.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n") }
        : {};
    }
    case "multiple_choice": {
      const p = multipleChoiceData.safeParse(data);
      const s = multipleChoiceSolution.safeParse(solution);
      return {
        question: p.success ? p.data.question : "",
        options: p.success ? p.data.options.join("\n") : "",
        answerIndex: s.success ? String(s.data.answerIndex) : "0",
      };
    }
    case "fill_blank": {
      const p = fillBlankData.safeParse(data);
      const s = fillBlankSolution.safeParse(solution);
      return {
        prompt: p.success ? p.data.prompt : "",
        answer: s.success ? s.data.answer : "",
        alternatives: s.success ? (s.data.alternatives ?? []).join(", ") : "",
      };
    }
    case "translation": {
      const p = translationData.safeParse(data);
      const s = translationSolution.safeParse(solution);
      return {
        instruction: p.success ? (p.data.instruction ?? "") : "",
        source: p.success ? p.data.source : "",
        answer: s.success ? s.data.answer : "",
        alternatives: s.success ? (s.data.alternatives ?? []).join(", ") : "",
      };
    }
    case "error_correction": {
      const p = errorCorrectionData.safeParse(data);
      const s = errorCorrectionSolution.safeParse(solution);
      return {
        instruction: p.success ? (p.data.instruction ?? "") : "",
        sentence: p.success ? p.data.sentence : "",
        answer: s.success ? s.data.answer : "",
        alternatives: s.success ? (s.data.alternatives ?? []).join(", ") : "",
      };
    }
    case "reorder_words": {
      const p = reorderWordsData.safeParse(data);
      return {
        instruction: p.success ? (p.data.instruction ?? "") : "",
        tokens: p.success ? p.data.tokens.join(" ") : "",
      };
    }
    default:
      return {};
  }
}

export default async function AdminPartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: part } = await supabase
    .from("parts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!part) notFound();

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("part_id", id)
    .order("position");

  const exerciseIds = (blocks ?? [])
    .filter((b) => isExerciseType(b.type))
    .map((b) => b.id);

  const solutions = new Map<string, unknown>();
  if (exerciseIds.length > 0) {
    const { data: sols } = await supabase
      .from("exercise_solutions")
      .select("block_id, solution")
      .in("block_id", exerciseIds);
    for (const s of sols ?? []) solutions.set(s.block_id, s.solution);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <BackLink href={`/admin/licoes/${part.lesson_id}`} label="Lição" />
        <Link href={`/partes/${part.id}`}>
          <Button type="button" variant="ghost" size="sm">
            Pré-visualizar parte
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-fg-primary">{part.title}</h1>

      <section className="flex flex-col gap-4">
        {(blocks ?? []).map((block) => (
          <Card key={block.id} padded className="flex flex-col gap-3">
            <div className="flex items-center justify-end gap-1">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveBlock}>
                  <input type="hidden" name="id" value={block.id} />
                  <input type="hidden" name="part_id" value={part.id} />
                  <input type="hidden" name="dir" value={dir} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label={dir === "up" ? "Subir bloco" : "Descer bloco"}
                    title={dir === "up" ? "Subir bloco" : "Descer bloco"}
                  >
                    {dir === "up" ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              ))}
              <ConfirmForm
                action={deleteBlock}
                message="Tem certeza que deseja excluir este bloco? Esta ação não pode ser desfeita."
              >
                <input type="hidden" name="id" value={block.id} />
                <input type="hidden" name="part_id" value={part.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  aria-label="Excluir bloco"
                  title="Excluir bloco"
                  className="text-danger hover:bg-danger-bg"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </ConfirmForm>
            </div>
            <BlockForm
              mode="edit"
              partId={part.id}
              courseId={part.course_id}
              blockId={block.id}
              type={block.type}
              initial={toInitial(block.type, block.data, solutions.get(block.id))}
            />
          </Card>
        ))}
      </section>

      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Novo bloco</h2>
        <BlockForm mode="create" partId={part.id} courseId={part.course_id} />
      </Card>
    </div>
  );
}
