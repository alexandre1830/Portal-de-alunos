"use client";

import { SortableList } from "@/components/admin/SortableList";
import { reorderBlocks } from "@/lib/admin/actions";

export function SortableBlocksList({
  partId,
  items,
}: {
  partId: string;
  items: { id: string; content: React.ReactNode }[];
}) {
  return (
    <SortableList
      items={items}
      className="flex flex-col gap-4"
      successMessage="Blocos reordenados"
      onReorder={async (ids) => {
        await reorderBlocks(partId, ids);
      }}
    />
  );
}
