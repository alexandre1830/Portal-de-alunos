import Link from "next/link";
import { redirect } from "next/navigation";

import { PreferencesForm } from "@/components/painel/PreferencesForm";
import { SignOutButton } from "@/components/painel/SignOutButton";
import { ThemeSwitch } from "@/components/painel/ThemeSwitch";
import { Card } from "@/components/ui/Card";
import { getUserPreferences } from "@/lib/preferences/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Idiomas das matrículas ativas → quais seções de voz mostrar.
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course:courses(language)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const enrolledLanguagesSet = new Set<"en" | "es">();
  for (const row of enrollments ?? []) {
    const lang = row.course?.language;
    if (lang === "en" || lang === "es") enrolledLanguagesSet.add(lang);
  }
  const enrolledLanguages = Array.from(enrolledLanguagesSet);

  const prefs = await getUserPreferences(supabase, user.id);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <Link
        href="/painel"
        className="text-sm text-fg-secondary hover:text-fg-primary"
      >
        ← Voltar ao painel
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Configurações</h1>
        <p className="text-sm text-fg-secondary">
          Ajuste a aparência, a voz dos áudios, sua senha e gerencie a sessão.
        </p>
      </div>

      {/* 1. Tema */}
      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Tema</h2>
        <ThemeSwitch />
      </Card>

      {/* 2. Vozes (PreferencesForm já tem seu próprio botão Salvar) */}
      <PreferencesForm
        initialVoiceEn={prefs.ttsVoiceEn}
        initialVoiceEs={prefs.ttsVoiceEs}
        initialRate={prefs.ttsRate}
        availableLanguages={enrolledLanguages}
      />

      {/* 3. Senha */}
      <Card padded className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-fg-primary">Senha</h2>
        <p className="text-sm text-fg-secondary">
          Atualize a senha de acesso à sua conta.
        </p>
        <Link
          href="/painel/senha"
          className="text-sm font-medium text-fg-primary underline self-start"
        >
          Trocar senha →
        </Link>
      </Card>

      {/* 4. Sair */}
      <Card padded className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-fg-primary">Sair</h2>
        <p className="text-sm text-fg-secondary">
          Encerre sua sessão neste dispositivo. Você será levado de volta à
          tela de login.
        </p>
        <SignOutButton />
      </Card>
    </main>
  );
}
