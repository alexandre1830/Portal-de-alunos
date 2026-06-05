"use client";

import { useActionState, useState } from "react";

import { SpeakButton } from "@/components/blocks/SpeakButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { savePreferences } from "@/lib/preferences/actions";
import { initialPreferencesState } from "@/lib/preferences/types";
import {
  DEFAULT_RATE,
  MAX_RATE,
  MIN_RATE,
  RATE_STEP,
  VOICES_BY_LANG,
  type VoiceOption,
} from "@/lib/tts/voices";
import { cn } from "@/lib/utils/cn";

interface Props {
  initialVoiceEn: string;
  initialVoiceEs: string;
  initialRate: number;
  // Idiomas das matrículas ativas do aluno. A seção de cada idioma só aparece
  // quando ele tem ao menos um curso naquele idioma.
  availableLanguages: ("en" | "es")[];
}

// Card único "Áudio" que envolve tudo (voz por idioma + velocidade + salvar).
// As subseções são separadas por border-b para dar identidade clara, e o
// botão "Salvar configurações" mora no rodapé do card — fica óbvio o que
// está sendo salvo.
export function PreferencesForm({
  initialVoiceEn,
  initialVoiceEs,
  initialRate,
  availableLanguages,
}: Props) {
  const showEn = availableLanguages.includes("en");
  const showEs = availableLanguages.includes("es");
  const [voiceEn, setVoiceEn] = useState(initialVoiceEn);
  const [voiceEs, setVoiceEs] = useState(initialVoiceEs);
  const [rate, setRate] = useState(
    Number.isFinite(initialRate) ? initialRate : DEFAULT_RATE,
  );
  const [state, formAction, pending] = useActionState(
    savePreferences,
    initialPreferencesState,
  );

  const hasAnyVoiceSection = showEn || showEs;

  return (
    <Card padded className="flex flex-col gap-0 p-0">
      <form action={formAction} className="flex flex-col">
        {/* Header do card */}
        <header className="flex flex-col gap-1 border-b border-border-primary px-5 py-4">
          <h2 className="text-base font-semibold text-fg-primary">Áudio</h2>
          <p className="text-sm text-fg-secondary">
            Voz das narrações e velocidade da fala usada nos textos e
            exercícios de pronúncia.
          </p>
        </header>

        <input type="hidden" name="tts_voice_en" value={voiceEn} />
        <input type="hidden" name="tts_voice_es" value={voiceEs} />
        <input type="hidden" name="tts_rate" value={rate.toFixed(2)} />

        {showEn && (
          <VoiceSection
            title="Voz para textos em inglês"
            voices={VOICES_BY_LANG.en}
            selected={voiceEn}
            onSelect={setVoiceEn}
            rate={rate}
          />
        )}

        {showEs && (
          <VoiceSection
            title="Voz para textos em espanhol"
            voices={VOICES_BY_LANG.es}
            selected={voiceEs}
            onSelect={setVoiceEs}
            rate={rate}
          />
        )}

        {!hasAnyVoiceSection && (
          <p className="border-b border-border-primary px-5 py-4 text-sm text-fg-secondary">
            Você ainda não está matriculado em nenhum curso. Quando estiver,
            as opções de voz aparecem aqui de acordo com o idioma do curso.
          </p>
        )}

        {/* Velocidade da fala */}
        <section className="flex flex-col gap-3 border-b border-border-primary px-5 py-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-fg-primary">
              Velocidade da fala
            </h3>
            <span className="text-sm text-fg-secondary">
              {rate.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min={MIN_RATE}
            max={MAX_RATE}
            step={RATE_STEP}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            aria-label="Velocidade da fala"
            className="w-full accent-fg-primary"
          />
          <div className="flex justify-between text-xs text-fg-tertiary">
            <span>Mais devagar ({MIN_RATE.toFixed(2)}x)</span>
            <span>Padrão ({DEFAULT_RATE.toFixed(2)}x)</span>
            <span>Mais rápido ({MAX_RATE.toFixed(2)}x)</span>
          </div>
          <p className="text-xs text-fg-tertiary">
            Vale para textos e exercícios de pronúncia. Diálogos mantêm o
            ritmo natural (cada personagem tem voz própria).
          </p>
        </section>

        {/* Rodapé: feedback + botão salvar */}
        <footer className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-h-5 flex-1">
            {state.error && (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            )}
            {state.notice && (
              <p role="status" className="text-sm text-success">
                {state.notice}
              </p>
            )}
          </div>
          <Button type="submit" loading={pending}>
            Salvar configurações
          </Button>
        </footer>
      </form>
    </Card>
  );
}

// Subseção de voz dentro do card "Áudio". Não é mais um Card próprio — é
// um <section> com border-b para casar com o resto da estrutura.
function VoiceSection({
  title,
  voices,
  selected,
  onSelect,
  rate,
}: {
  title: string;
  voices: VoiceOption[];
  selected: string;
  onSelect: (id: string) => void;
  rate: number;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border-primary px-5 py-4">
      <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
      <ul className="flex flex-col divide-y divide-border-primary">
        {voices.map((v) => {
          const active = v.id === selected;
          return (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <label
                className={cn(
                  "flex flex-1 cursor-pointer items-center gap-3 text-sm",
                  active ? "text-fg-primary" : "text-fg-secondary",
                )}
              >
                <input
                  type="radio"
                  checked={active}
                  onChange={() => onSelect(v.id)}
                  className="accent-fg-primary"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{v.label}</span>
                  <span className="text-xs text-fg-tertiary">
                    {v.accent} ·{" "}
                    {v.gender === "female" ? "Feminino" : "Masculino"}
                  </span>
                </span>
              </label>
              <SpeakButton
                iconOnly
                body={{
                  text: v.example,
                  lang: v.language,
                  voice: v.id,
                  rate,
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
