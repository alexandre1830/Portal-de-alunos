import { SpeakButton } from "@/components/blocks/SpeakButton";
import type { DialogueData } from "@/lib/blocks/schemas";

export function DialogueBlock({ data }: { data: DialogueData }) {
  // Para o áudio, lemos apenas as falas (sem os nomes dos personagens).
  const spoken = data.lines.map((line) => line.text).join(" ");
  return (
    <div className="flex flex-col gap-2">
      {data.lines.map((line, i) => (
        <p key={i} className="text-fg-primary">
          <span className="font-medium text-fg-secondary">{line.speaker}: </span>
          {line.text}
        </p>
      ))}
      <SpeakButton text={spoken} />
    </div>
  );
}
