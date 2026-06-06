"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signIn } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/types";

// Login dedicado: full-screen com fundo azul-marinho da marca, logo no
// topo e card escuro centralizado. Não consome bg/fg/border do tema —
// queremos a aparência azul independente de claro/escuro.
const fieldShellCls =
  "flex items-center gap-2 rounded-md bg-white/95 px-3 text-sm text-gray-900";
const inputCls =
  "h-11 flex-1 bg-transparent placeholder:text-gray-400 focus:outline-none";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    signIn,
    initialAuthState,
  );

  const year = new Date().getFullYear();

  return (
    <main
      className="relative flex min-h-dvh w-full flex-col items-center justify-center px-6 py-10 text-white"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, var(--color-primary-300) 0%, var(--color-primary-500) 35%, var(--color-primary-700) 100%)",
      }}
    >
      {/* Branding */}
      <div className="flex flex-col items-center gap-2">
        <Logo className="h-32 w-32" priority />
        <span className="text-sm text-white/80">Portal de Alunos</span>
      </div>

      {/* Card */}
      <form
        action={formAction}
        className="mt-8 flex w-full max-w-md flex-col gap-4 rounded-xl border border-white/10 bg-gray-900/80 p-6 shadow-[var(--shadow-3)] backdrop-blur"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-medium">
            E-mail
          </label>
          <div className={fieldShellCls}>
            <EnvelopeIcon className="h-4 w-4 text-primary-brand" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@exemplo.com"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="text-sm font-medium">
            Senha
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="!bg-white/95 !text-gray-900 placeholder:!text-gray-400"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-300">
            {state.error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 text-sm">
          <label className="inline-flex items-center gap-2 text-white/85">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded border-white/30 bg-white/10 accent-white"
            />
            Lembrar de mim
          </label>
          <Link
            href="/recuperar-senha"
            className="text-white/70 hover:text-white"
          >
            Esqueci a senha
          </Link>
        </div>

        <Button
          type="submit"
          loading={isPending}
          className="w-full bg-primary-brand hover:bg-primary-brand-hover active:bg-primary-brand-active"
        >
          Entrar
          <ArrowRightIcon className="h-4 w-4" />
        </Button>

        <p className="text-center text-xs text-white/70">
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-white underline underline-offset-2"
          >
            Cadastre-se
          </Link>
        </p>
      </form>

      <footer className="mt-8 text-center text-xs text-white/60">
        © {year} Mr. Dave Idiomas — Todos os direitos reservados
      </footer>
    </main>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
