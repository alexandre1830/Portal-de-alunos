"use client";

import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { cn } from "@/lib/utils/cn";

// Editor rich text com toolbar de formatação (bold/italic/underline,
// alinhamento, listas, headings, blockquote, undo/redo). Salva HTML no
// hidden input que carrega o `name` esperado pelo schema do bloco.
//
// Uso: substitui um <textarea name="text" defaultValue={...}/> mantendo
// a mesma assinatura para o FormData do BlockForm.

interface Props {
  name: string;
  initialHtml?: string;
  placeholder?: string;
  // Disparado a cada alteração (já com o HTML atualizado). O hidden input
  // também atualiza, então quem está num <form onChange> automático
  // continua funcionando — mas TipTap não emite eventos onChange no
  // input invisível, então também chamamos onUpdate explicitamente.
  onUpdate?: (html: string) => void;
}

export function RichTextEditor({
  name,
  initialHtml = "",
  placeholder,
  onUpdate,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false, // evita hydration mismatch no Next App Router
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap min-h-32 w-full rounded-b-md border-x border-b border-border-primary bg-bg-primary px-3 py-2 text-sm text-fg-primary",
          "focus:outline-none",
        ),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // Sincroniza o hidden input para que FormData(form) pegue o valor.
      const input = document.getElementById(
        `rt-${name}`,
      ) as HTMLInputElement | null;
      if (input) input.value = html;
      // E dispara um evento "input" no form para o autosave do pai
      // detectar como mudança (form.onChange).
      input?.form?.dispatchEvent(new Event("input", { bubbles: true }));
      onUpdate?.(html);
    },
  });

  if (!editor) {
    return (
      <textarea
        name={name}
        defaultValue={initialHtml}
        placeholder={placeholder}
        className="min-h-32 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm text-fg-primary"
      />
    );
  }

  return (
    <div className="flex flex-col">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Hidden input que carrega o HTML para o FormData do pai */}
      <input type="hidden" id={`rt-${name}`} name={name} defaultValue={initialHtml} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-border-primary bg-bg-secondary px-1 py-1">
      <ToolbarGroup>
        <ToolbarButton
          label="Negrito (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Itálico (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Sublinhado (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          label="Tachado"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarButton
          label="Título"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Subtítulo"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarButton
          label="Lista com bullets"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <BulletIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <OrderedIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Citação"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteIcon />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarButton
          label="Alinhar à esquerda"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeftIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Centralizar"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenterIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Alinhar à direita"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRightIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Justificar"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustifyIcon />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarButton
          label="Desfazer (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Refazer (Ctrl+Shift+Z)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <RedoIcon />
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px bg-border-primary" aria-hidden />;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs transition-colors",
        active
          ? "bg-bg-tertiary text-fg-primary"
          : "text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

// --- Icons inline (stroke=currentColor, mesmo padrão do resto do app) ---
function svgProps(className = "h-3.5 w-3.5") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

function BulletIcon() {
  return (
    <svg {...svgProps()}>
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <circle cx="4" cy="6" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function OrderedIcon() {
  return (
    <svg {...svgProps()}>
      <line x1="10" x2="21" y1="6" y2="6" />
      <line x1="10" x2="21" y1="12" y2="12" />
      <line x1="10" x2="21" y1="18" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  );
}
function QuoteIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2" />
    </svg>
  );
}
function AlignLeftIcon() {
  return (
    <svg {...svgProps()}>
      <line x1="3" x2="21" y1="6" y2="6" />
      <line x1="3" x2="15" y1="12" y2="12" />
      <line x1="3" x2="18" y1="18" y2="18" />
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg {...svgProps()}>
      <line x1="3" x2="21" y1="6" y2="6" />
      <line x1="6" x2="18" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg {...svgProps()}>
      <line x1="3" x2="21" y1="6" y2="6" />
      <line x1="9" x2="21" y1="12" y2="12" />
      <line x1="6" x2="21" y1="18" y2="18" />
    </svg>
  );
}
function AlignJustifyIcon() {
  return (
    <svg {...svgProps()}>
      <line x1="3" x2="21" y1="6" y2="6" />
      <line x1="3" x2="21" y1="12" y2="12" />
      <line x1="3" x2="21" y1="18" y2="18" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
    </svg>
  );
}
