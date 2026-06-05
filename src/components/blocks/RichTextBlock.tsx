import type { RichTextData } from "@/lib/blocks/schemas";

// data.text pode estar em dois formatos por compatibilidade:
//   - HTML (produzido pelo TipTap editor) — detectado por presença de tags.
//   - Texto plano (modelo antigo, ainda no banco) — quebra em parágrafos.
// Em ambos os casos aplicamos a classe `tiptap` para os mesmos estilos
// (parágrafos, listas, headings, blockquotes etc.) usados no editor.

function looksLikeHtml(s: string): boolean {
  // Heurística simples: contém tag aberta e fechada.
  return /<\/?[a-zA-Z][^>]*>/.test(s);
}

export function RichTextBlock({ data }: { data: RichTextData }) {
  if (looksLikeHtml(data.text)) {
    // HTML gerado por TipTap (admin é privilegiado, conteúdo seguro).
    return (
      <div
        className="tiptap text-fg-primary"
        dangerouslySetInnerHTML={{ __html: data.text }}
      />
    );
  }
  const paragraphs = data.text
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 0);
  return (
    <div className="tiptap text-fg-primary">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
