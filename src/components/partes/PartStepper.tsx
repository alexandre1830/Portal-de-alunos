"use client";

import { useState, useTransition } from "react";

import { BlockRenderer, type TtsOverride } from "@/components/blocks/BlockRenderer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { isExerciseType } from "@/lib/blocks/schemas";
import { markPartCompleted } from "@/lib/parts/actions";
import { toast } from "@/lib/toast/store";
import type { Block } from "@/types/content";

// Stepper que mostra UM bloco por vez dentro de uma parte (estilo Duolingo).
//
// Regras de avanço:
//   - Conteúdo (rich_text, vocabulary, reading_tts, dialogue_tts,
//     pronunciation, speaking): botão "Próximo" sempre disponível.
//   - Exercícios (mc, fill_blank, translation, reorder, error_correction):
//     "Próximo" aparece só DEPOIS que o aluno acerta (callback onSolved
//     vindo do renderer). Em ReorderWords/MultipleChoice só "perfect"
//     conta; nos demais "close" também libera.
//
// O último bloco é seguido pela "tela final": se a parte JÁ está completa
// (todos os exercícios foram acertados, ou marcada manualmente), mostra
// um parabéns; se não, e a parte NÃO tem exercícios, oferece o botão
// "Marcar como concluída".
export function PartStepper({
  partId,
  blocks,
  tts,
  initiallyCompleted,
}: {
  partId: string;
  blocks: Block[];
  tts?: TtsOverride;
  initiallyCompleted: boolean;
}) {
  const total = blocks.length;
  const [index, setIndex] = useState(0);
  // Tracking dos blocos que viraram "Próximo disponível" — para que voltar
  // não force resolver de novo (o servidor já guarda o melhor estado, então
  // re-renderizar o exercício não derruba o solved).
  const [unlockedAhead, setUnlockedAhead] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [pending, startTransition] = useTransition();

  const hasExerciseInPart = blocks.some((b) => isExerciseType(b.type));
  const current = blocks[index];
  const isLast = index === total - 1;
  const isExercise = current ? isExerciseType(current.type) : false;
  // Para conteúdo, sempre pode seguir. Para exercício, precisa estar solved.
  const canAdvance = !isExercise || unlockedAhead.has(index);

  function markSolved(i: number) {
    setUnlockedAhead((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }

  function next() {
    if (!canAdvance) return;
    if (index < total - 1) {
      setIndex(index + 1);
    }
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  function handleMarkCompleted() {
    if (completed || pending) return;
    startTransition(async () => {
      const res = await markPartCompleted(partId);
      if (res.ok) {
        setCompleted(true);
        toast.success({ title: "Parte concluída!" });
      } else if (res.error) {
        toast.danger({ title: res.error });
      }
    });
  }

  if (total === 0) {
    return (
      <Card padded>
        <p className="text-sm text-fg-secondary">
          Esta parte ainda não tem conteúdo.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho do stepper: posição + barra */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-fg-tertiary">
          <span>
            {index + 1} de {total}
          </span>
          {isExercise && !canAdvance && (
            <span>Responda para continuar</span>
          )}
        </div>
        <ProgressBar
          value={index + 1}
          max={total}
          ariaLabel="Progresso na parte"
        />
      </div>

      {/* Bloco atual */}
      <Card key={current?.id} padded className="animate-fade-slide-in">
        {current && (
          <BlockRenderer
            block={current}
            tts={tts}
            onSolved={() => markSolved(index)}
          />
        )}
      </Card>

      {/* Controles */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prev}
          disabled={index === 0}
        >
          Anterior
        </Button>

        {!isLast ? (
          <Button
            type="button"
            size="sm"
            onClick={next}
            disabled={!canAdvance}
          >
            Próximo
          </Button>
        ) : (
          // No último bloco, o botão muda:
          //  - se a parte tem exercícios, a conclusão é automática — o aluno
          //    só vê "Fim da parte" e segue navegando.
          //  - se NÃO tem exercícios e ainda não está concluída, mostra o
          //    botão para marcar.
          <FinalAction
            hasExerciseInPart={hasExerciseInPart}
            completed={completed}
            pending={pending}
            canAdvance={canAdvance}
            onMark={handleMarkCompleted}
          />
        )}
      </div>
    </div>
  );
}

function FinalAction({
  hasExerciseInPart,
  completed,
  pending,
  canAdvance,
  onMark,
}: {
  hasExerciseInPart: boolean;
  completed: boolean;
  pending: boolean;
  canAdvance: boolean;
  onMark: () => void;
}) {
  if (completed) {
    return (
      <span className="text-sm font-medium text-success">
        Parte concluída ✓
      </span>
    );
  }
  if (hasExerciseInPart) {
    return (
      <span className="text-xs text-fg-tertiary">
        {canAdvance
          ? "Resolva todos os exercícios para concluir a parte."
          : "Responda o exercício para continuar."}
      </span>
    );
  }
  return (
    <Button type="button" size="sm" loading={pending} onClick={onMark}>
      Marcar como concluída
    </Button>
  );
}
