import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  // Dias com atividade — Set de strings YYYY-MM-DD para lookup rápido.
  activeDates: Set<string>;
  // Total de dias com atividade no período carregado.
  activeDaysInPeriod: number;
}

// Fuso usado para resolver "que dia foi essa atividade?". Precisa
// bater com o usado em supabase/migrations/.../apply_xp_event(), senão
// o calendário renderizado dessincroniza dos agregados de streak.
const STREAK_TZ = "America/Sao_Paulo";

function toISODateInTz(iso: string, tz: string): string {
  // Intl com en-CA produz exatamente "YYYY-MM-DD" — formato estável
  // para chave de Set e comparação.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  return parts;
}

// Carrega os números agregados de gamificação + o conjunto de dias com
// pelo menos um xp_event nos últimos `days` dias. "Atividade" = qualquer
// XP recebido naquele dia.
export async function getStreakData(
  supabase: Client,
  userId: string,
  days = 90,
): Promise<StreakData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const [{ data: gam }, { data: events }] = await Promise.all([
    supabase
      .from("user_gamification")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("xp_events")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", start.toISOString()),
  ]);

  const activeDates = new Set<string>();
  for (const e of events ?? []) {
    activeDates.add(toISODateInTz(e.created_at, STREAK_TZ));
  }

  return {
    currentStreak: gam?.current_streak ?? 0,
    longestStreak: gam?.longest_streak ?? 0,
    lastActivityDate: gam?.last_activity_date ?? null,
    activeDates,
    activeDaysInPeriod: activeDates.size,
  };
}
