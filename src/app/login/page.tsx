"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signIn } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/types";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    signIn,
    initialAuthState,
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-fg-primary">Entrar</h1>
        <p className="text-sm text-fg-secondary">
          Acesse o portal com seu e-mail e senha.
        </p>
      </div>

      <Card padded>
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@exemplo.com"
          />
          <PasswordInput
            label="Senha"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" loading={isPending} className="w-full">
            Entrar
          </Button>
          <Link
            href="/recuperar-senha"
            className="self-center text-xs text-fg-secondary hover:text-fg-primary"
          >
            Esqueci a senha
          </Link>
        </form>
      </Card>

      <p className="text-center text-sm text-fg-secondary">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-fg-primary underline">
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
