// Bootstrap do professor de demonstração.
// Cria (ou reaproveita) professor@demo.com já confirmado, define role=teacher
// e o atribui como teacher_id do curso "ingles-a1-adulto". Idempotente.
// Rode com: pnpm seed:professor

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
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROFESSOR_EMAIL = "professor@demo.com";
const PROFESSOR_PASSWORD = "professor1234";
const COURSE_SLUG = "ingles-a1-adulto";

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listErr) throw listErr;

let user = listed.users.find((u) => u.email === PROFESSOR_EMAIL);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: PROFESSOR_EMAIL,
    password: PROFESSOR_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Professor Demo" },
  });
  if (error) throw error;
  user = data.user;
  console.log(`Conta criada: ${PROFESSOR_EMAIL}`);
} else {
  console.log(`Conta já existe: ${PROFESSOR_EMAIL}`);
}

// role=teacher (trigger permite via service_role após a migration de junho).
const { error: roleErr } = await admin
  .from("profiles")
  .update({ role: "teacher" })
  .eq("id", user.id);
if (roleErr) throw roleErr;

// Atribui ao curso demo (se existir).
const { data: course } = await admin
  .from("courses")
  .select("id")
  .eq("slug", COURSE_SLUG)
  .maybeSingle();
if (course) {
  const { error: assignErr } = await admin
    .from("courses")
    .update({ teacher_id: user.id })
    .eq("id", course.id);
  if (assignErr) throw assignErr;
  console.log(`Atribuído como professor do curso "${COURSE_SLUG}".`);
} else {
  console.log(
    `Curso "${COURSE_SLUG}" não existe — rode \`pnpm seed\` antes para criá-lo.`,
  );
}

console.log(`Login professor: ${PROFESSOR_EMAIL} / ${PROFESSOR_PASSWORD}`);
