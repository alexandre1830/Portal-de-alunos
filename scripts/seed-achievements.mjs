// Seed do catálogo de conquistas (MVP). Idempotente por code (unique).
// Rode com: pnpm seed:achievements

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltam vars no .env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CATALOG = [
  {
    code: "first_part_completed",
    title: "Primeira parte",
    description: "Você concluiu sua primeira parte.",
    xp_reward: 10,
  },
  {
    code: "first_perfect_part",
    title: "Sem erros",
    description: "Você fechou uma parte com 3 estrelas.",
    xp_reward: 20,
  },
  {
    code: "streak_3",
    title: "Sequência de 3",
    description: "3 dias seguidos estudando.",
    xp_reward: 15,
  },
  {
    code: "streak_7",
    title: "Sequência de 7",
    description: "Uma semana inteira sem falhar.",
    xp_reward: 50,
  },
  {
    code: "first_lesson_completed",
    title: "Lição completa",
    description: "Você concluiu todas as partes de uma lição.",
    xp_reward: 30,
  },
];

const { data: existing } = await admin
  .from("achievements")
  .select("code, id");
const byCode = new Map((existing ?? []).map((a) => [a.code, a.id]));

let inserted = 0,
  updated = 0;
for (const entry of CATALOG) {
  if (byCode.has(entry.code)) {
    await admin.from("achievements").update(entry).eq("code", entry.code);
    updated++;
  } else {
    await admin.from("achievements").insert(entry);
    inserted++;
  }
}
console.log(`Conquistas: ${inserted} novas, ${updated} atualizadas, total ${CATALOG.length}.`);
