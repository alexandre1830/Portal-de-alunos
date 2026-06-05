"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { submitExercise, type ExerciseResult } from "@/lib/exercises/actions";
import type { MultipleChoiceData } from "@/lib/blocks/schemas";
import { notifyExerciseResult } from "@/lib/toast/notify-result";
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
    notifyExerciseResult(res);
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
                "rounded-md border px-3 py-2 text-left text-sm transition-all duration-150 active:scale-[0.99]",
                "disabled:cursor-not-allowed disabled:active:scale-100",
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
