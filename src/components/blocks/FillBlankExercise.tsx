"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { submitExercise, type ExerciseResult } from "@/lib/exercises/actions";
import type { FillBlankData } from "@/lib/blocks/schemas";

export function FillBlankExercise({
  blockId,
  data,
}: {
  blockId: string;
  data: FillBlankData;
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
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-fg-primary">{data.prompt}</p>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={solved}
        placeholder="Sua resposta"
        aria-label="Sua resposta"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      {result?.ok && result.state && <Feedback result={result} />}
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

function Feedback({ result }: { result: ExerciseResult }) {
  if (result.state === "perfect") {
    return (
      <p role="status" className="text-sm text-success">
        Perfeito!{result.xpAwarded > 0 ? ` +${result.xpAwarded} XP` : ""}
      </p>
    );
  }
  if (result.state === "close") {
    return (
      <p role="status" className="text-sm text-warning">
        Quase lá — typo tolerado.
        {result.xpAwarded > 0 ? ` +${result.xpAwarded} XP` : ""}
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
