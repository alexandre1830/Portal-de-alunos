import { SpeakButton } from "@/components/blocks/SpeakButton";
import type { ReadingData } from "@/lib/blocks/schemas";

export function ReadingBlock({ data }: { data: ReadingData }) {
  return (
    <div className="flex flex-col gap-2">
      {data.title && (
        <h4 className="font-medium text-fg-primary">{data.title}</h4>
      )}
      <p className="whitespace-pre-wrap leading-relaxed text-fg-primary">
        {data.text}
      </p>
      <SpeakButton body={{ text: data.text, lang: "en" }} />
    </div>
  );
}
