import type { RichTextData } from "@/lib/blocks/schemas";

export function RichTextBlock({ data }: { data: RichTextData }) {
  const paragraphs = data.text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return (
    <div className="flex flex-col gap-3 leading-relaxed text-fg-primary">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
