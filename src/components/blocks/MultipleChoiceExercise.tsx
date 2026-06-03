"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { submitExercise, type ExerciseResult } from "@/lib/exercises/actions";
import type { MultipleChoiceData } from "@/lib/blocks/schemas";
import { cn } from "@/lib/utils/cn";

export function MultipleChoiceExercise({
  blockId,
  data,
}: {
  blockId: string;
  data: MultipleChoiceData;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [pending, setPending] = useState(false);

  const solved = result?.state === "perfect";

  async function handleSubmit() {
    if (selected === null || pending || solved) return;
    setPending(true);
    const res = await submitExercise({ blockId, selectedIndex: selected });
    setPending(false);
    setResult(res);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-fg-primary">{data.question}</p>

      <div className="flex flex-col gap-2">
        {data.options.map((option, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              disabled={solved}
              onClick={() => setSelected(i)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                "disabled:cursor-not-allowed",
                isSelected
                  ? "border-fg-primary bg-bg-secondary text-fg-primary"
                  : "border-border-primary text-fg-secondary hover:bg-bg-secondary",
              )}
              aria-pressed={isSelected}
            >
              {option}
            </button>
          );
        })}
      </div>

      {result?.ok && result.state && (
        <Feedback result={result} />
      )}
      {result && !result.ok && result.error && (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      )}

      {!solved && (
        <div>
          <Button
            type="button"
            size="sm"
            loading={pending}
            disabled={selected === null}
            onClick={handleSubmit}
          >
            {result?.state === "incorrect" ? "Tentar de novo" : "Responder"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Feedback({ result }: { result: ExerciseResult }) {
  if (result.state === "perfect") {
    return (
      <p role="status" className="text-sm text-success">
        Correto!{result.xpAwarded > 0 ? ` +${result.xpAwarded} XP` : ""}
      </p>
    );
  }
  if (result.state === "incorrect") {
    return (
      <p role="status" className="text-sm text-danger">
        Não foi dessa vez.
        {result.correctAnswer ? ` Resposta certa: ${result.correctAnswer}.` : ""}
      </p>
    );
  }
  return null;
}
