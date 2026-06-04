"use client";

import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/actions";

// Botão de sair com confirmação. Usa onSubmit para interceptar — se o usuário
// cancelar, a Server Action não é disparada.
export function SignOutButton() {
  return (
    <form
      action={signOut}
      onSubmit={(e) => {
        if (!confirm("Tem certeza que deseja sair da sua conta?")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger">
        Sair
      </Button>
    </form>
  );
}
