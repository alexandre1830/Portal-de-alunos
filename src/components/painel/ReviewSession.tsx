"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { reviewItem, type ReviewItemResult } from "@/lib/srs/actions";
import type { SrsDueItem } from "@/lib/srs/queries";
import { cn } from "@/lib/utils/cn";

interface Props {
  items: SrsDueItem[];
}

// Sessão de revisão com auto-correção (ADR 0006 aplicado à revisão):
//   1. Mostra a pergunta (termo, frase ou pergunta original).
//   2. Aluno digita a resposta.
//   3. Submit → Server Action grade via Levenshtein → estado
//      (perfect/close/incorrect).
//   4. Feedback inline: cor + resposta canônica + XP.
//   5. "Próximo" avança.
//
// XP é reduzido (revisão repete conteúdo). "Quase" e "errado" não
// pontuam — só "perfect".
export function ReviewSession({ items: initialItems }: Props) {
  // Snapshot dos itens no MONTE da sessão. A lista de "due items" muda no
  // servidor a cada resposta (o item revisado sai do due), mas a sessão
  // precisa trabalhar sobre um conjunto FIXO — senão o `index` remapearia
  // para itens diferentes no meio do caminho. Defesa em profundidade: o
  // action já não revalida esta rota (ver srs/actions.ts), mas se algo
  // revalidar por outro caminho, este snapshot mantém a sessão estável.
  const [items] = useState(() => initialItems);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ReviewItemResult | null>(null);
  const [counts, setCounts] = useState({
    perfect: 0,
    close: 0,
    incorrect: 0,
  });
  const [pending, startTransition] = useTransition();

  const total = items.length;
  const current = items[index];

  if (!current) {
    return (
      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Sessão concluída
        </h2>
        <p className="text-sm text-fg-secondary">
          Você revisou {total} {total === 1 ? "item" : "itens"} nesta sessão.
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          <li>Acertei: {counts.perfect}</li>
          <li>Quase: {counts.close}</li>
          <li>Errei: {counts.incorrect}</li>
        </ul>
        <div className="flex gap-2 pt-2">
          <Link href="/painel/revisar">
            <Button variant="secondary" size="sm">
              Voltar à lista
            </Button>
          </Link>
          <Link href="/painel">
            <Button size="sm">Ir ao painel</Button>
          </Link>
        </div>
      </Card>
    );
  }

  // Renderização da "pergunta" depende do tipo:
  //  - exercise: a pergunta original
  //  - vocab:    "Como se diz X?" — o aluno escreve a tradução
  //  - speaking: a frase para o aluno digitar de novo (recall textual)
  let prompt: string;
  let helper: string | null = null;
  let sourceLabel: string;
  switch (current.payload.type) {
    case "exercise":
      prompt = current.payload.question;
      sourceLabel = "Exercício";
      break;
    case "vocab":
      prompt = `Como se diz "${current.payload.term}"?`;
      helper = current.payload.example ?? null;
      sourceLabel = "Vocabulário";
      break;
    case "speaking":
      prompt = "Escreva a frase para revisar:";
      helper = `"${current.payload.phrase}"`;
      sourceLabel = "Speaking";
      break;
  }

  const submitted = result !== null;

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (pending || submitted) return;
    if (answer.trim().length === 0) return;
    startTransition(async () => {
      const res = await reviewItem(current!.id, answer);
      setResult(res);
      if (res.ok) {
        setCounts((c) => ({ ...c, [res.state]: c[res.state] + 1 }));
      }
    });
  }

  function nextItem() {
    setResult(null);
    setAnswer("");
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-fg-tertiary">
        <span>
          Item {index + 1} de {total}
        </span>
        <span>{sourceLabel}</span>
      </div>

      <Card padded className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-fg-tertiary">
            Pergunta
          </span>
          <p className="text-lg font-medium text-fg-primary">{prompt}</p>
          {helper && (
            <p className="text-sm italic text-fg-secondary">{helper}</p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 border-t border-border-primary pt-3"
        >
          <label
            htmlFor="srs-answer"
            className="text-xs uppercase tracking-wide text-fg-tertiary"
          >
            Sua resposta
          </label>
          <Input
            // key por item: remonta o input a cada pergunta, re-disparando
            // o autoFocus (que só age na montagem) e garantindo campo limpo.
            key={current.id}
            id="srs-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Digite aqui"
            autoFocus
            disabled={pending || submitted}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </form>

        {/* Feedback após submit */}
        {result && (
          <div
            className={cn(
              "flex flex-col gap-1 rounded-md border px-3 py-2 text-sm",
              result.state === "perfect" &&
                "border-success/40 bg-success-bg/40 text-success",
              result.state === "close" &&
                "border-warning/40 bg-warning-bg/40 text-warning",
              result.state === "incorrect" &&
                "border-danger/40 bg-danger-bg/40 text-danger",
            )}
          >
            <span className="font-medium">
              {result.state === "perfect" && `Perfeito! +${result.xpAwarded} XP`}
              {result.state === "close" && "Quase lá"}
              {result.state === "incorrect" && "Não foi dessa vez"}
            </span>
            <span className="text-xs text-fg-secondary">
              Resposta:{" "}
              <span className="font-medium text-fg-primary">
                {result.expected}
              </span>
            </span>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            loading={pending}
            disabled={pending || answer.trim().length === 0}
          >
            Enviar
          </Button>
        ) : (
          <Button onClick={nextItem}>
            {index + 1 < total ? "Próximo" : "Concluir"}
          </Button>
        )}
      </div>
    </div>
  );
}
