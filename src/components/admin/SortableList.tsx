"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";

import { toast } from "@/lib/toast/store";
import { cn } from "@/lib/utils/cn";

// Wrapper genérico para listas reordenáveis com dnd-kit (vertical).
// Cada item já vem pré-renderizado pelo servidor; aqui só envolvemos
// em SortableContext + handle de drag. Ao soltar, atualiza ordem local
// (otimista) e chama onReorder com a nova lista de ids.
//
// Acessibilidade:
//   - keyboard sensor com setas (vai e volta entre itens)
//   - foco visível no handle (Tab vai parar nele)
export interface SortableItem {
  id: string;
  // Conteúdo já renderizado pelo servidor — recebido como ReactNode.
  content: React.ReactNode;
}

export function SortableList({
  items,
  onReorder,
  className,
  emptyMessage,
  // Texto curto para anunciar no toast quando a reordenação salva
  // (ex.: "Módulos reordenados").
  successMessage,
}: {
  items: SortableItem[];
  onReorder: (ids: string[]) => Promise<void>;
  className?: string;
  emptyMessage?: React.ReactNode;
  successMessage: string;
}) {
  const [order, setOrder] = useState<SortableItem[]>(items);
  const [, startTransition] = useTransition();

  // Se o servidor enviar uma nova lista (ex.: depois de inserir item),
  // ressincroniza local. Comparação por ids/length basta.
  if (
    items.length !== order.length ||
    items.some((it, i) => order[i]?.id !== it.id)
  ) {
    // Só atualiza se a ordem do servidor de fato divergir do estado.
    // (Isso pode rodar durante o render; React tolera porque setOrder
    // não muda o resultado deste render se for o mesmo array.)
    const serverIds = items.map((i) => i.id).join(",");
    const localIds = order.map((i) => i.id).join(",");
    if (serverIds !== localIds) setOrder(items);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Distance maior (8px) porque agora o card inteiro é arrastável —
      // queremos garantir que um clique acidental num botão dentro do card
      // nunca seja interpretado como início de drag.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((i) => i.id === active.id);
    const newIndex = order.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    startTransition(async () => {
      await onReorder(next.map((i) => i.id));
      toast.success({ title: successMessage });
    });
  }

  if (order.length === 0 && emptyMessage) {
    return <>{emptyMessage}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={order.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {order.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {item.content}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// O card inteiro vira a área de drag: listeners e attributes do dnd-kit
// vão no wrapper. Com activationConstraint.distance=8, clicks em
// buttons/links/menus dentro do card não disparam drag — o drag só
// inicia quando o ponteiro se move > 8px enquanto pressionado.
//
// A11y: o wrapper recebe role=button + tabIndex para teclado (setas)
// via KeyboardSensor; outros widgets focáveis dentro do card continuam
// recebendo Tab normalmente.
function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "min-w-0 cursor-grab touch-manipulation outline-none active:cursor-grabbing",
        "focus-visible:ring-2 focus-visible:ring-fg-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
        isDragging && "z-10 opacity-90",
      )}
      aria-label="Arraste para reordenar"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
