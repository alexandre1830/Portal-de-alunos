"use client";

import { useRef, useState, useTransition } from "react";

import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/Button";
import { createBlock, updateBlock } from "@/lib/admin/actions";
import { toast } from "@/lib/toast/store";
import { cn } from "@/lib/utils/cn";

const TYPES: [string, string][] = [
  ["rich_text", "Texto"],
  ["reading_tts", "Leitura (áudio)"],
  ["vocabulary", "Vocabulário"],
  ["dialogue_tts", "Diálogo (áudio)"],
  ["pronunciation", "Pronúncia"],
  ["examples", "Exemplos"],
  ["speaking", "Speaking (falar)"],
  ["multiple_choice", "Múltipla escolha"],
  ["fill_blank", "Lacuna"],
  ["translation", "Tradução"],
  ["reorder_words", "Reordenar palavras"],
  ["error_correction", "Correção de erro"],
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
  // translation / error_correction / reorder_words
  instruction?: string;
  source?: string;
  sentence?: string;
  tokens?: string;
}

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";
// field-sizing-content (Tailwind v4) faz o textarea crescer pra acomodar
// o conteúdo, eliminando o scroll interno. O rows={N} de cada textarea
// define só a altura inicial enquanto está vazio. A rolagem fica a cargo
// da página inteira.
const areaCls =
  "w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm text-fg-primary field-sizing-content";

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-fg-tertiary">{children}</p>;
}

// Modo `create`: o admin escolhe um tipo e preenche; submit explícito
// porque não há "registro" para autossalvar ainda.
// Modo `edit`: AUTOSAVE — qualquer mudança em qualquer campo dispara um
// updateBlock com debounce de 800ms. Indicador de estado fica no topo.
export function BlockForm({
  mode,
  partId,
  courseId,
  blockId,
  type: fixedType,
  initial = {},
  headerSlot,
}: {
  mode: "create" | "edit";
  partId: string;
  courseId: string;
  blockId?: string;
  type?: string;
  initial?: BlockInitial;
  // Conteúdo extra à direita do header (ex.: BlockRowMenu) — alinhado
  // na mesma linha do tipo do bloco, evitando uma faixa morta acima.
  headerSlot?: React.ReactNode;
}) {
  const [type, setType] = useState(fixedType ?? "rich_text");
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  type Status = "idle" | "saving" | "saved";
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();

  function handleFormChange() {
    if (mode !== "edit") return;
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      const fd = new FormData(form);
      startTransition(async () => {
        try {
          await updateBlock(fd);
          setStatus("saved");
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setStatus("idle"), 1600);
        } catch {
          setStatus("idle");
          toast.danger({
            title: "Não consegui salvar o bloco",
            description: "Tente alterar de novo em instantes.",
          });
        }
      });
    }, 800);
  }

  return (
    <form
      ref={formRef}
      action={mode === "create" ? createBlock : undefined}
      onChange={handleFormChange}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="part_id" value={partId} />
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="type" value={type} />
      {blockId && <input type="hidden" name="id" value={blockId} />}

      <div className="flex items-center justify-between gap-3">
        {mode === "create" ? (
          <select
            className={cn(inputCls, "max-w-xs flex-1")}
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

        <div className="flex items-center gap-3">
          {mode === "edit" && <SaveStatus status={status} />}
          {headerSlot}
        </div>
      </div>

      {(type === "reading_tts" ||
        type === "pronunciation" ||
        type === "speaking" ||
        type === "examples") && (
        <input
          name="title"
          defaultValue={initial.title}
          placeholder="Título (opcional)"
          className={inputCls}
        />
      )}

      {type === "rich_text" && (
        <RichTextEditor
          name="text"
          initialHtml={initial.text ?? ""}
          placeholder="Escreva o conteúdo da explicação…"
        />
      )}

      {type === "reading_tts" && (
        <textarea
          name="text"
          defaultValue={initial.text}
          placeholder="Texto"
          rows={4}
          className={areaCls}
        />
      )}

      {type === "pronunciation" && (
        <>
          <textarea
            name="items"
            defaultValue={initial.items}
            placeholder={"Uma frase por linha"}
            rows={4}
            className={areaCls}
          />
          <Hint>Uma frase por linha — cada uma terá seu próprio botão de áudio.</Hint>
        </>
      )}

      {type === "speaking" && (
        <>
          <textarea
            name="items"
            defaultValue={initial.items}
            placeholder={"Uma frase por linha"}
            rows={4}
            className={areaCls}
          />
          <Hint>
            Uma frase por linha — o aluno fala cada uma (Web Speech API) e o
            sistema compara com Levenshtein. Não conta para conclusão da
            parte; XP entra na gamificação.
          </Hint>
        </>
      )}

      {type === "examples" && (
        <>
          <textarea
            name="items"
            defaultValue={initial.items}
            placeholder={"frase | tradução (opcional)"}
            rows={4}
            className={areaCls}
          />
          <Hint>
            Uma frase por linha — opcionalmente seguida de “| tradução”.
            Cada frase ganha botão de áudio.
          </Hint>
        </>
      )}

      {type === "vocabulary" && (
        <>
          <textarea
            name="items"
            defaultValue={initial.items}
            placeholder={"termo: tradução | exemplo (opcional)"}
            rows={4}
            className={areaCls}
          />
          <Hint>
            Um item por linha: <code>termo: tradução | exemplo</code> (exemplo é opcional).
          </Hint>
        </>
      )}

      {type === "dialogue_tts" && (
        <>
          <textarea
            name="lines"
            defaultValue={initial.lines}
            placeholder={"Personagem: fala"}
            rows={4}
            className={areaCls}
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
            rows={3}
            className={areaCls}
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

      {type === "translation" && (
        <>
          <input
            name="instruction"
            defaultValue={initial.instruction}
            placeholder="Instrução (ex.: Traduza para o inglês)"
            className={inputCls}
          />
          <input
            name="source"
            defaultValue={initial.source}
            placeholder="Frase original"
            className={inputCls}
          />
          <input
            name="answer"
            defaultValue={initial.answer}
            placeholder="Tradução canônica"
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

      {type === "error_correction" && (
        <>
          <input
            name="instruction"
            defaultValue={initial.instruction}
            placeholder="Instrução (ex.: Corrija a frase abaixo)"
            className={inputCls}
          />
          <input
            name="sentence"
            defaultValue={initial.sentence}
            placeholder="Frase com erro"
            className={inputCls}
          />
          <input
            name="answer"
            defaultValue={initial.answer}
            placeholder="Frase corrigida"
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

      {type === "reorder_words" && (
        <>
          <input
            name="instruction"
            defaultValue={initial.instruction}
            placeholder="Instrução (opcional)"
            className={inputCls}
          />
          <input
            name="tokens"
            defaultValue={initial.tokens}
            placeholder="Palavras na ORDEM CORRETA, separadas por espaço"
            className={inputCls}
          />
          <Hint>
            Escreva a frase já na ordem certa. O sistema embaralha as palavras
            quando mostra ao aluno.
          </Hint>
        </>
      )}

      {/* Modo create mantém botão explícito — o bloco ainda não existe
          para ser autossalvo. Modo edit não tem botão. */}
      {mode === "create" && (
        <Button type="submit" variant="secondary" size="sm" className="self-start">
          Adicionar bloco
        </Button>
      )}
    </form>
  );
}

// Indicador discreto de autosave. Mesmo padrão usado em PreferencesForm.
function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "saved"
          ? "bg-success-bg text-success"
          : "bg-bg-tertiary text-fg-secondary",
      )}
    >
      {status === "saving" ? (
        <>
          <Spinner />
          Salvando…
        </>
      ) : (
        <>
          <CheckIcon />
          Salvo
        </>
      )}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-30"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
