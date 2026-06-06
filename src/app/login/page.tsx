"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Logo } from "@/components/shared/Logo";
import { signIn } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/types";

// Login no padrão do sistema irmão (Sistema de Gestão): fundo navy com
// gradiente diagonal, 3 círculos coloridos flutuando, card branco
// centralizado com inputs cinza-clarinho. Não consome bg/fg do tema —
// queremos a aparência azul/branca independente de claro/escuro.

const labelCls = "text-[0.8125rem] font-semibold text-gray-700";
const inputWrapperCls = "relative flex items-center";
const inputCls =
  "h-10 w-full rounded-md border-[1.5px] border-gray-300 bg-white pl-[38px] pr-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-primary-brand focus:shadow-[0_0_0_3px_rgba(3,45,111,0.12)] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500";
const inputIconCls =
  "pointer-events-none absolute left-[13px] text-gray-400";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    signIn,
    initialAuthState,
  );
  const [showPassword, setShowPassword] = useState(false);

  const year = new Date().getFullYear();

  return (
    <main
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden p-6 text-white"
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary) 0%, #051f50 60%, #0a0a1a 100%)",
      }}
    >
      {/* Formas flutuantes de fundo — três círculos borrados em
          contrapasso, dão "respiração" à tela. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <span
          className="animate-login-float absolute -right-20 -top-30 h-[480px] w-[480px] rounded-full opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, var(--color-primary-light), transparent 70%)",
            top: "-120px",
            right: "-80px",
          }}
        />
        <span
          className="animate-login-float-reverse absolute h-[360px] w-[360px] rounded-full opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, var(--color-secondary), transparent 70%)",
            bottom: "-100px",
            left: "-60px",
          }}
        />
        <span
          className="animate-login-float-slow absolute h-[240px] w-[240px] rounded-full opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, #4a90e2, transparent 70%)",
            top: "50%",
            left: "10%",
          }}
        />
      </div>

      {/* Container animado */}
      <div className="animate-login-slide-up relative z-10 flex w-full max-w-[420px] flex-col gap-8">
        {/* Branding */}
        <header className="flex flex-col items-center gap-3 text-center">
          <Logo
            className="h-[72px] w-[72px] rounded-2xl shadow-[0_10px_15px_rgba(0,0,0,0.08),0_4px_6px_rgba(0,0,0,0.04)]"
            priority
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-white/60">Portal de Alunos</p>
          </div>
        </header>

        {/* Card branco com o form */}
        <section
          aria-label="Formulário de login"
          className="rounded-xl border border-white/50 bg-white/[0.97] p-9 shadow-[0_25px_50px_rgba(0,0,0,0.18)] backdrop-blur"
        >
          <form action={formAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className={labelCls}>
                E-mail
              </label>
              <div className={inputWrapperCls}>
                <EnvelopeIcon className={`${inputIconCls} h-4 w-4`} />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className={labelCls}>
                Senha
              </label>
              <div className={inputWrapperCls}>
                <LockIcon className={`${inputIconCls} h-4 w-4`} />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                  className="absolute right-2 rounded p-1 text-gray-400 transition-colors hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <label className="inline-flex cursor-pointer select-none items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-[18px] w-[18px] cursor-pointer rounded border-[1.5px] border-gray-300 accent-primary-brand"
                />
                Lembrar de mim
              </label>
              <Link
                href="/recuperar-senha"
                className="font-medium text-primary-brand transition-colors hover:text-primary-brand-hover hover:underline"
              >
                Esqueci a senha
              </Link>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-primary-brand bg-primary-brand px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(3,45,111,0.30)] transition-all hover:-translate-y-px hover:border-primary-brand-hover hover:bg-primary-brand-hover hover:shadow-[0_6px_20px_rgba(3,45,111,0.35)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Entrar
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>

            {state.error && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                {state.error}
              </p>
            )}
          </form>
        </section>

        <footer className="text-center text-xs text-white/40">
          © {year} Mr. Dave Idiomas — Todos os direitos reservados
        </footer>
      </div>
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

function LockIcon({ className }: { className?: string }) {
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
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
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
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
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
