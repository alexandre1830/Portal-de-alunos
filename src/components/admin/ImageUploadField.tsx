"use client";

import { useRef, useState, useTransition } from "react";

import { TrashIcon } from "@/components/icons/TrashIcon";
import { Button } from "@/components/ui/Button";
import { uploadLessonImage } from "@/lib/blocks/image-actions";
import { toast } from "@/lib/toast/store";

// Campo do bloco de imagem: upload para o bucket `lesson-images`, preview,
// alt (obrigatório), legenda (opcional) e largura máxima.
//
// alt/caption/width são inputs COM `name` — o `onChange` do <form> do
// BlockForm já dispara o autosave neles. A URL vem do upload (não é
// digitada), então vai num hidden input sincronizado por ref + flush
// imediato: upload é ação deliberada e o admin costuma sair logo depois.

const inputCls =
  "h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary";

const WIDTH_OPTIONS: { value: string; label: string }[] = [
  { value: "full", label: "Cheia (largura do card)" },
  { value: "medium", label: "Média" },
  { value: "small", label: "Pequena" },
];

interface Props {
  courseId: string;
  initialUrl?: string;
  initialAlt?: string;
  initialCaption?: string;
  initialWidth?: string;
  onUpdate?: () => void;
  onFlush?: () => void;
}

export function ImageUploadField({
  courseId,
  initialUrl = "",
  initialAlt = "",
  initialCaption = "",
  initialWidth = "full",
  onUpdate,
  onFlush,
}: Props) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set("course_id", courseId);
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadLessonImage(fd);
      if (!res.ok || !res.url) {
        toast.danger({
          title: "Não consegui enviar a imagem",
          description: res.error ?? "Tente de novo.",
        });
        return;
      }
      setUrl(res.url);
      if (hiddenRef.current) hiddenRef.current.value = res.url;
      toast.success({ title: "Imagem enviada" });
      // Salva na hora — a URL não passa pelo onChange do form.
      onFlush?.();
    });
  }

  function removeImage() {
    setUrl("");
    if (hiddenRef.current) hiddenRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
    onFlush?.();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* URL da imagem — preenchida pelo upload, nunca digitada. */}
      <input ref={hiddenRef} type="hidden" name="url" defaultValue={initialUrl} />

      {/* Input de arquivo fica escondido; o botão abaixo o aciona. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {url ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="max-h-64 w-auto max-w-full rounded-md border border-border-primary object-contain"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => fileRef.current?.click()}
            >
              Trocar imagem
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={removeImage}
              disabled={pending}
            >
              <TrashIcon className="h-4 w-4" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border-primary p-4">
          <Button
            type="button"
            size="sm"
            loading={pending}
            onClick={() => fileRef.current?.click()}
          >
            Enviar imagem
          </Button>
          <p className="text-xs text-fg-tertiary">
            PNG, JPG, WEBP ou GIF — até 5 MB.
          </p>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-secondary">
          Texto alternativo (obrigatório)
        </span>
        <input
          name="alt"
          defaultValue={initialAlt}
          required
          placeholder="Descreva a imagem para quem não pode vê-la"
          className={inputCls}
          onChange={() => onUpdate?.()}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-secondary">Legenda (opcional)</span>
        <input
          name="caption"
          defaultValue={initialCaption}
          placeholder="Aparece abaixo da imagem"
          className={inputCls}
          onChange={() => onUpdate?.()}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-secondary">Largura máxima</span>
        <select
          name="width"
          defaultValue={initialWidth}
          className={inputCls}
          onChange={() => onUpdate?.()}
        >
          {WIDTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
