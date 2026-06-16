"use client";

import { useRef, useState, useTransition } from "react";

import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/Button";
import { createBlock, updateBlock } from "@/lib/admin/actions";
import { toast } from "@/lib/toast/store";
import { cn } from "@/lib/utils/cn";

// Catálogo de tipos de bloco organizado em GRUPOS — usado pelo picker
// visual em modo create. Conteúdo lecionado vs exercícios autocorrigidos:
// separar visualmente ajuda o admin a montar a parte com intenção.
type BlockTypeEntry = {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const CONTENT_TYPES: BlockTypeEntry[] = [
  { value: "rich_text", label: "Texto", description: "Explicação rica em texto.", icon: <IconText /> },
  { value: "reading_tts", label: "Leitura (áudio)", description: "Texto com botão de áudio.", icon: <IconReading /> },
  { value: "vocabulary", label: "Vocabulário", description: "Lista termo + tradução + áudio.", icon: <IconVocab /> },
  { value: "dialogue_tts", label: "Diálogo (áudio)", description: "Falas entre personagens.", icon: <IconDialogue /> },
  { value: "pronunciation", label: "Pronúncia", description: "Frases para ouvir e treinar.", icon: <IconPronunciation /> },
  { value: "examples", label: "Exemplos", description: "Frases-exemplo com tradução e áudio.", icon: <IconExamples /> },
  { value: "speaking", label: "Speaking (falar)", description: "Aluno fala; sistema compara.", icon: <IconSpeaking /> },
];

const EXERCISE_TYPES_PICKER: BlockTypeEntry[] = [
  { value: "multiple_choice", label: "Múltipla escolha", description: "Pergunta + alternativas.", icon: <IconChoice /> },
  { value: "fill_blank", label: "Lacuna", description: "Aluno completa a frase.", icon: <IconBlank /> },
  { value: "translation", label: "Tradução", description: "Traduzir a frase.", icon: <IconTranslate /> },
  { value: "reorder_words", label: "Reordenar palavras", description: "Montar a frase na ordem certa.", icon: <IconReorder /> },
  { value: "error_correction", label: "Correção de erro", description: "Reescrever frase corrigida.", icon: <IconCorrection /> },
];

const ALL_TYPES = [...CONTENT_TYPES, ...EXERCISE_TYPES_PICKER];
const TYPE_LABEL = Object.fromEntries(
  ALL_TYPES.map((t) => [t.value, t.label]),
);

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
  // Em create: começa sem tipo escolhido (mostra picker em vez do form).
  // Em edit: tipo é fixo e sempre definido.
  const [type, setType] = useState<string | null>(
    fixedType ?? (mode === "edit" ? "rich_text" : null),
  );
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

  // Picker visual em duas seções (Conteúdo / Exercícios). Aparece SOMENTE
  // em modo create, antes do tipo ser escolhido. Após o clique, abrimos o
  // form de fato — com "← Trocar tipo" pra voltar.
  if (mode === "create" && !type) {
    return (
      <div className="flex flex-col gap-6">
        <TypeGroup
          title="Conteúdo lecionado"
          subtitle="Blocos que apresentam o conteúdo da parte."
          items={CONTENT_TYPES}
          onPick={setType}
        />
        <TypeGroup
          title="Exercícios autocorrigidos"
          subtitle="Blocos com correção automática e XP."
          items={EXERCISE_TYPES_PICKER}
          onPick={setType}
        />
        {headerSlot && (
          <div className="flex justify-end">{headerSlot}</div>
        )}
      </div>
    );
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
      <input type="hidden" name="type" value={type ?? ""} />
      {blockId && <input type="hidden" name="id" value={blockId} />}

      <div className="flex items-center justify-between gap-3">
        {mode === "create" ? (
          // Em create, depois de escolher o tipo, mostramos o label
          // do tipo + um link "Trocar tipo" pra voltar ao picker.
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase text-fg-tertiary">
              {type ? TYPE_LABEL[type] ?? type : ""}
            </span>
            <button
              type="button"
              onClick={() => setType(null)}
              className="text-xs text-primary-brand hover:underline"
            >
              ← Trocar tipo
            </button>
          </div>
        ) : (
          <span className="text-xs font-medium uppercase text-fg-tertiary">
            {type ? TYPE_LABEL[type] ?? type : ""}
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

// Picker visual: uma seção (Conteúdo OU Exercícios) com card pequeno
// por tipo. Click escolhe o tipo e abre o form correspondente.
function TypeGroup({
  title,
  subtitle,
  items,
  onPick,
}: {
  title: string;
  subtitle: string;
  items: BlockTypeEntry[];
  onPick: (value: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
        <p className="text-xs text-fg-secondary">{subtitle}</p>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.value}>
            <button
              type="button"
              onClick={() => onPick(it.value)}
              className="group flex w-full items-center gap-3 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2.5 text-left transition-colors hover:border-primary-brand/40 hover:bg-primary-brand-surface"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-tertiary text-fg-secondary transition-colors group-hover:bg-primary-brand-surface group-hover:text-primary-brand">
                {it.icon}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-fg-primary group-hover:text-primary-brand">
                  {it.label}
                </span>
                <span className="truncate text-xs text-fg-tertiary">
                  {it.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Ícones inline para o picker. SVGs outline 24x24 — compactos e sem
// dependência de novos arquivos em /icons (só usados aqui).
function svgProps() {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "h-5 w-5",
  };
}

function IconText() {
  return (
    <svg {...svgProps()}>
      <path d="M4 6h16M4 12h12M4 18h8" />
    </svg>
  );
}

function IconReading() {
  return (
    <svg {...svgProps()}>
      <path d="M3 5a2 2 0 0 1 2-2h4a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H3z" />
      <path d="M21 5a2 2 0 0 0-2-2h-4a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" />
    </svg>
  );
}

function IconVocab() {
  return (
    <svg {...svgProps()}>
      <path d="M4 4h16v16H4z" />
      <path d="M4 9h16M9 4v16" />
    </svg>
  );
}

function IconDialogue() {
  return (
    <svg {...svgProps()}>
      <path d="M3 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2z" />
      <path d="M16 9h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v3l-4-3" />
    </svg>
  );
}

function IconPronunciation() {
  return (
    <svg {...svgProps()}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      <path d="M18.5 6a8 8 0 0 1 0 12" />
    </svg>
  );
}

function IconExamples() {
  return (
    <svg {...svgProps()}>
      <path d="M9 7h11M9 12h11M9 17h7" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function IconSpeaking() {
  return (
    <svg {...svgProps()}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function IconChoice() {
  return (
    <svg {...svgProps()}>
      <circle cx="5" cy="7" r="2" />
      <circle cx="5" cy="17" r="2" />
      <path d="M11 7h10M11 17h10" />
      <path d="m3.5 7 1 1 2-2" />
    </svg>
  );
}

function IconBlank() {
  return (
    <svg {...svgProps()}>
      <path d="M4 6h6M14 6h6M4 12h16M4 18h6M14 18h6" />
    </svg>
  );
}

function IconTranslate() {
  return (
    <svg {...svgProps()}>
      <path d="M3 5h10" />
      <path d="M7 3v2c0 4-2 8-5 9" />
      <path d="M3 9c0 3 4 6 9 7" />
      <path d="m13 21 4-10 4 10" />
      <path d="M14.5 17h5" />
    </svg>
  );
}

function IconReorder() {
  return (
    <svg {...svgProps()}>
      <path d="M3 6h13l-3-3M21 18H8l3 3" />
    </svg>
  );
}

function IconCorrection() {
  return (
    <svg {...svgProps()}>
      <path d="M14 4 5 13l-1 5 5-1 9-9z" />
      <path d="m13 5 4 4" />
      <path d="m15 18 2 2 4-4" />
    </svg>
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
