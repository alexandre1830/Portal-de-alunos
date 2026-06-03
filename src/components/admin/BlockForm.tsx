"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { createBlock, updateBlock } from "@/lib/admin/actions";

const TYPES: [string, string][] = [
  ["rich_text", "Texto rico"],
  ["reading_tts", "Leitura (áudio)"],
  ["vocabulary", "Vocabulário"],
  ["dialogue_tts", "Diálogo (áudio)"],
  ["pronunciation", "Pronúncia"],
  ["multiple_choice", "Múltipla escolha"],
  ["fill_blank", "Lacuna"],
];

const TYPE_LABEL = Object.fromEntries(TYPES);

export interface BlockInitial {
  text?: string;
  title?: string;
  items?: string;
  lines?: string;
  options?: string;
  question?: string;
  answerIndex?: string;
  prompt?: string;
  answer?: string;
  alternatives?: string;
}

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";
const areaCls =
  "w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm text-fg-primary";

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-fg-tertiary">{children}</p>;
}

export function BlockForm({
  mode,
  partId,
  courseId,
  blockId,
  type: fixedType,
  initial = {},
}: {
  mode: "create" | "edit";
  partId: string;
  courseId: string;
  blockId?: string;
  type?: string;
  initial?: BlockInitial;
}) {
  const [type, setType] = useState(fixedType ?? "rich_text");
  const action = mode === "create" ? createBlock : updateBlock;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="part_id" value={partId} />
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="type" value={type} />
      {blockId && <input type="hidden" name="id" value={blockId} />}

      {mode === "create" ? (
        <select
          className={inputCls}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs font-medium uppercase text-fg-tertiary">
          {TYPE_LABEL[type] ?? type}
        </span>
      )}

      {(type === "reading_tts" || type === "pronunciation") && (
        <input
          name="title"
          defaultValue={initial.title}
          placeholder="Título (opcional)"
          className={inputCls}
        />
      )}

      {(type === "rich_text" || type === "reading_tts") && (
        <textarea
          name="text"
          defaultValue={initial.text}
          placeholder="Texto"
          className={`${areaCls} h-28`}
        />
      )}

      {type === "pronunciation" && (
        <>
          <textarea
            name="items"
            defaultValue={initial.items}
            placeholder={"Uma frase por linha"}
            className={`${areaCls} h-28`}
          />
          <Hint>Uma frase por linha — cada uma terá seu próprio botão de áudio.</Hint>
        </>
      )}

      {type === "vocabulary" && (
        <>
          <textarea
            name="items"
            defaultValue={initial.items}
            placeholder={"termo | tradução | exemplo (opcional)"}
            className={`${areaCls} h-28`}
          />
          <Hint>Um item por linha: termo | tradução | exemplo (exemplo é opcional).</Hint>
        </>
      )}

      {type === "dialogue_tts" && (
        <>
          <textarea
            name="lines"
            defaultValue={initial.lines}
            placeholder={"Personagem: fala"}
            className={`${areaCls} h-28`}
          />
          <Hint>Uma fala por linha no formato “Personagem: texto”.</Hint>
        </>
      )}

      {type === "multiple_choice" && (
        <>
          <input
            name="question"
            defaultValue={initial.question}
            placeholder="Pergunta"
            className={inputCls}
          />
          <textarea
            name="options"
            defaultValue={initial.options}
            placeholder={"Uma alternativa por linha"}
            className={`${areaCls} h-24`}
          />
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            Índice da resposta correta (0 = primeira):
            <input
              name="answerIndex"
              type="number"
              min={0}
              defaultValue={initial.answerIndex ?? "0"}
              className={`${inputCls} w-20`}
            />
          </label>
        </>
      )}

      {type === "fill_blank" && (
        <>
          <input
            name="prompt"
            defaultValue={initial.prompt}
            placeholder="Enunciado"
            className={inputCls}
          />
          <input
            name="answer"
            defaultValue={initial.answer}
            placeholder="Resposta correta"
            className={inputCls}
          />
          <input
            name="alternatives"
            defaultValue={initial.alternatives}
            placeholder="Variações aceitas (separadas por vírgula)"
            className={inputCls}
          />
        </>
      )}

      <Button type="submit" variant="secondary" size="sm" className="self-start">
        {mode === "create" ? "Adicionar bloco" : "Salvar bloco"}
      </Button>
    </form>
  );
}
