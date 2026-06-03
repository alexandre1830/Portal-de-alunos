"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/browser";

type State = "idle" | "loading" | "playing" | "error";

// Botão "Ouvir" para blocos de leitura/diálogo. Invoca a Edge Function `tts`
// (gera/recupera o MP3 do cache no Storage) e toca o áudio. `body` é o payload
// da função: { text, lang } para leitura ou { lines, lang } para diálogo. A URL
// é guardada para não reinvocar a função em re-toques.
export function SpeakButton({ body }: { body: Record<string, unknown> }) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  async function handleClick() {
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState("idle");
      return;
    }

    let url = urlRef.current;
    if (!url) {
      setState("loading");
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("tts", {
        body,
      });
      if (error || !data?.url) {
        setState("error");
        return;
      }
      url = data.url as string;
      urlRef.current = url;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setState("idle");
    audio.onerror = () => setState("error");
    setState("playing");
    audio.play().catch(() => setState("error"));
  }

  const label =
    state === "playing"
      ? "⏹ Parar"
      : state === "error"
        ? "🔊 Tentar de novo"
        : "🔊 Ouvir";

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        loading={state === "loading"}
        onClick={handleClick}
        aria-label="Ouvir o áudio deste trecho"
      >
        {label}
      </Button>
      {state === "error" && (
        <span className="text-xs text-danger">
          Não foi possível gerar o áudio agora.
        </span>
      )}
    </div>
  );
}
