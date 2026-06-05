"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TranslationData } from "@/lib/blocks/schemas";
import { submitExercise, type ExerciseResult } from "@/lib/exercises/actions";
import { notifyExerciseResult } from "@/lib/toast/notify-result";

// Renderer de exercício de tradução. Estrutura idêntica ao FillBlankExercise:
// input de texto + feedback por toast. O grading no servidor reusa o
// Levenshtein do fill_blank.
export function TranslationExercise({
  blockId,
  data,
}: {
  blockId: string;
  data: TranslationData;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [pending, setPending] = useState(false);

  const solved = result?.state === "perfect" || result?.state === "close";

  async function handleSubmit() {
    if (text.trim().length === 0 || pending || solved) return;
    setPending(true);
    const res = await submitExercise({ blockId, text });
    setPending(false);
    setResult(res);
    notifyExerciseResult(res, { answerLabel: "Tradução" });
  }

  return (
    <div className="flex flex-col gap-3">
      {data.instruction && (
        <p className="text-sm font-medium text-fg-secondary">
          {data.instruction}
        </p>
      )}
      <p className="text-lg font-medium text-fg-primary">{data.source}</p>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={solved}
        placeholder="Sua tradução"
        aria-label="Sua tradução"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      {!solved && (
        <div>
          <Button
            type="button"
            size="sm"
            loading={pending}
            disabled={text.trim().length === 0}
            onClick={handleSubmit}
          >
            {result?.state === "incorrect" ? "Tentar de novo" : "Responder"}
          </Button>
        </div>
      )}
    </div>
  );
}
