import Link from "next/link";
import { redirect } from "next/navigation";

import { KeyIcon } from "@/components/icons/KeyIcon";
import { AvatarUpload } from "@/components/painel/AvatarUpload";
import { PreferencesForm } from "@/components/painel/PreferencesForm";
import { SignOutButton } from "@/components/painel/SignOutButton";
import { ThemeSwitch } from "@/components/painel/ThemeSwitch";
import { BackLink } from "@/components/shared/BackLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getUserPreferences } from "@/lib/preferences/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

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
      <BackLink href="/painel" label="Voltar ao painel" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Configurações</h1>
        <p className="text-sm text-fg-secondary">
          Ajuste sua foto, a aparência, a voz dos áudios, sua senha e
          gerencie a sessão.
        </p>
      </div>

      {/* 0. Foto de perfil */}
      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Foto de perfil
        </h2>
        <AvatarUpload
          initialSrc={profile?.avatar_url ?? null}
          fullName={profile?.full_name ?? null}
          email={profile?.email ?? user.email ?? ""}
        />
      </Card>

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
      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Senha</h2>
        <p className="text-sm text-fg-secondary">
          Atualize a senha de acesso à sua conta.
        </p>
        <Link href="/painel/senha" className="self-start">
          <Button type="button" variant="secondary">
            <KeyIcon className="h-4 w-4" />
            Trocar senha
          </Button>
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
