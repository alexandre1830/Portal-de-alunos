"use client";

import { useRef, useState, useTransition } from "react";

import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { removeAvatar, uploadAvatar } from "@/lib/profile/actions";
import { toast } from "@/lib/toast/store";

// Componente cliente para o aluno enviar ou remover a foto de perfil.
// Mostra preview imediato; chama uploadAvatar via Server Action.
export function AvatarUpload({
  initialSrc,
  fullName,
  email,
}: {
  initialSrc: string | null;
  fullName: string | null;
  email: string;
}) {
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    fileRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview imediato (objectURL) enquanto o upload está em andamento.
    const previewUrl = URL.createObjectURL(file);
    setSrc(previewUrl);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadAvatar(fd);
      if (res.ok) {
        setSrc(res.url);
        toast.success({
          title: "Foto atualizada",
          description: "Sua nova imagem de perfil já está visível.",
        });
      } else {
        // Reverte para o estado anterior.
        setSrc(initialSrc);
        toast.danger({
          title: "Não consegui salvar a foto",
          description: res.error ?? "Tente novamente.",
        });
      }
      URL.revokeObjectURL(previewUrl);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleRemove() {
    if (pending) return;
    startTransition(async () => {
      const res = await removeAvatar();
      if (res.ok) {
        setSrc(null);
        toast.success({ title: "Foto removida" });
      } else {
        toast.danger({
          title: "Não consegui remover a foto",
          description: res.error ?? undefined,
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={src} fullName={fullName} email={email} size="xl" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={pickFile}
            loading={pending}
            disabled={pending}
          >
            {src ? "Trocar foto" : "Enviar foto"}
          </Button>
          {src && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              disabled={pending}
            >
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-fg-tertiary">
          PNG, JPG, WEBP ou GIF — até 3 MB.
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
