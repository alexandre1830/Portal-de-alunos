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

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
    activeDates.add(toISODate(new Date(e.created_at)));
  }

  return {
    currentStreak: gam?.current_streak ?? 0,
    longestStreak: gam?.longest_streak ?? 0,
    lastActivityDate: gam?.last_activity_date ?? null,
    activeDates,
    activeDaysInPeriod: activeDates.size,
  };
}
