"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { reviewItem } from "@/lib/srs/actions";
import type { SrsDueItem } from "@/lib/srs/queries";
import type { ReviewRating } from "@/lib/srs/sm2";

interface Props {
  items: SrsDueItem[];
}

// Sessão de revisão estilo flashcard:
//   1. Mostra "frente" (pergunta / termo).
//   2. Aluno clica "Mostrar resposta" para revelar o verso.
//   3. Aluno se autoavalia: Errei / Quase / Acertei -> aplica SM-2 no servidor.
//   4. Avança para o próximo item, ou mostra resumo final.
//
// Sem fetch da lista no cliente: vem renderizada no SSR. Quando acaba a fila,
// linkamos de volta para que o próximo carregamento traga itens novos.
export function ReviewSession({ items }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0 });
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
          <li>Acertei: {counts.good}</li>
          <li>Quase: {counts.hard}</li>
          <li>Errei: {counts.again}</li>
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

  // Renderização da "frente" e "verso" depende do tipo de item:
  //  - exercise: pergunta -> resposta
  //  - vocab:    termo -> tradução (+ exemplo)
  //  - speaking: "Tente dizer" + frase -> mesma frase (auto-avaliação)
  let front: string;
  let back: string;
  let extra: string | null = null;
  let sourceLabel: string;
  switch (current.payload.type) {
    case "exercise":
      front = current.payload.question;
      back = current.payload.answer;
      sourceLabel = "Exercício";
      break;
    case "vocab":
      front = current.payload.term;
      back = current.payload.translation;
      extra = current.payload.example ?? null;
      sourceLabel = "Vocabulário";
      break;
    case "speaking":
      front = current.payload.phrase;
      back = current.payload.phrase;
      extra = "Tente dizer em voz alta — depois revele e avalie como foi.";
      sourceLabel = "Speaking";
      break;
  }

  function handleRate(rating: ReviewRating) {
    const itemId = current?.id;
    if (!itemId) return;
    const fd = new FormData();
    fd.set("item_id", itemId);
    fd.set("rating", rating);
    startTransition(async () => {
      await reviewItem(fd);
      setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }));
      setRevealed(false);
      setIndex((i) => i + 1);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-fg-tertiary">
        <span>
          Item {index + 1} de {total}
        </span>
        <span>{sourceLabel}</span>
      </div>

      <Card padded className="flex min-h-48 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-fg-tertiary">
            Pergunta
          </span>
          <p className="text-lg font-medium text-fg-primary">{front}</p>
        </div>

        {revealed && (
          <div className="flex flex-col gap-1 border-t border-border-primary pt-3">
            <span className="text-xs uppercase tracking-wide text-fg-tertiary">
              Resposta
            </span>
            <p className="text-lg text-fg-primary">{back}</p>
            {extra && (
              <p className="text-sm italic text-fg-secondary">{extra}</p>
            )}
          </div>
        )}
      </Card>

      {!revealed ? (
        <Button onClick={() => setRevealed(true)} className="self-start">
          Mostrar resposta
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            onClick={() => handleRate("again")}
            loading={pending}
            disabled={pending}
          >
            Errei
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleRate("hard")}
            loading={pending}
            disabled={pending}
          >
            Quase
          </Button>
          <Button
            onClick={() => handleRate("good")}
            loading={pending}
            disabled={pending}
          >
            Acertei
          </Button>
        </div>
      )}
    </div>
  );
}
