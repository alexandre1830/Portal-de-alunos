"use client";

import { useMemo } from "react";

import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DAY_LABELS,
  formatStartTime,
  nextOccurrenceBRT,
  type LiveSession,
} from "@/lib/live-sessions/queries";

// Card "Próxima aula" no painel do aluno. Recebe TODAS as aulas
// cadastradas e escolhe a próxima ocorrência (recorrência semanal em BRT).
// Mostra: professor (avatar + nome), dia+hora da próxima e botão para
// entrar na aula.
export function UpcomingLiveSessionCard({
  sessions,
}: {
  sessions: LiveSession[];
}) {
  // useMemo com input estável evita recomputar. A "agora" só é avaliada
  // na primeira renderização do card — pra atualizar de fato no rollover
  // do horário, o painel seria recarregado (revalidatePath).
  const next = useMemo(() => {
    if (sessions.length === 0) return null;
    const now = new Date();
    let best: { session: LiveSession; when: Date } | null = null;
    for (const s of sessions) {
      const when = nextOccurrenceBRT(s.dayOfWeek, s.startTime, now);
      if (!best || when < best.when) best = { session: s, when };
    }
    return best;
  }, [sessions]);

  if (sessions.length === 0 || !next) return null;

  const session = next.session;
  // "Está acontecendo agora?" — janela de 60 minutos antes / 60 minutos
  // depois do horário marcado, em BRT.
  const now = new Date();
  const minutesAway = Math.round(
    (next.when.getTime() - now.getTime()) / 60_000,
  );
  const isLive = minutesAway > -60 && minutesAway <= 60;

  return (
    <Card
      padded
      className="flex flex-col gap-4 border-primary-brand/30 bg-primary-brand-surface/30"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Próxima aula
        </h2>
        {isLive && (
          <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Acontecendo agora
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Avatar
          src={session.teacherAvatarUrl}
          fullName={session.teacherName}
          email={session.teacherName ?? "professor"}
          size="md"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-fg-primary">
            {session.teacherName ?? "Professor"}
          </span>
          <span className="text-xs text-fg-tertiary">
            {DAY_LABELS[session.dayOfWeek]} · {formatStartTime(session.startTime)}
          </span>
        </div>
      </div>

      <a
        href={session.meetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start"
      >
        <Button type="button" size="sm">
          {isLive ? "Entrar agora" : "Abrir link da aula"}
        </Button>
      </a>

      {sessions.length > 1 && (
        <p className="text-xs text-fg-tertiary">
          Você tem mais {sessions.length - 1}{" "}
          {sessions.length - 1 === 1
            ? "aula cadastrada nesta semana."
            : "aulas cadastradas nesta semana."}
        </p>
      )}
    </Card>
  );
}
