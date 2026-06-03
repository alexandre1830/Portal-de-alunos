import type { VocabularyData } from "@/lib/blocks/schemas";

export function VocabularyBlock({ data }: { data: VocabularyData }) {
  return (
    <ul className="flex flex-col divide-y divide-border-primary">
      {data.items.map((item, i) => (
        <li key={i} className="flex flex-col gap-0.5 py-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-fg-primary">{item.term}</span>
            <span className="text-sm text-fg-secondary">
              {item.translation}
            </span>
          </div>
          {item.example && (
            <span className="text-sm italic text-fg-tertiary">
              {item.example}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
