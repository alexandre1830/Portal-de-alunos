import type { DialogueData } from "@/lib/blocks/schemas";

export function DialogueBlock({ data }: { data: DialogueData }) {
  return (
    <div className="flex flex-col gap-2">
      {data.lines.map((line, i) => (
        <p key={i} className="text-fg-primary">
          <span className="font-medium text-fg-secondary">{line.speaker}: </span>
          {line.text}
        </p>
      ))}
      <span className="text-xs text-fg-tertiary">🔊 Áudio (em breve)</span>
    </div>
  );
}
