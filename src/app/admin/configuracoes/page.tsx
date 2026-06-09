import Link from "next/link";

import { Card } from "@/components/ui/Card";
import {
  PasswordSection,
  SignOutSection,
  ThemeSection,
} from "@/components/shared/SettingsSections";
import { requireAdmin } from "@/lib/admin/guard";

// Configurações do admin. Mesmas seções comuns (Tema · Senha · Sair)
// + cards de "Ver como aluno" / "Ver como professor", que antes ficavam
// no header como links rápidos. A entrada agora é discreta — via
// ícone de engrenagem no header.
export default async function AdminConfiguracoesPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Configurações</h1>
        <p className="text-sm text-fg-secondary">
          Ajuste a aparência, sua senha e gerencie a sessão. 
        </p>
      </div>

      {/* Pré-visualização: deslocados das ações rápidas para as
          configurações. O admin não precisa ver isso o tempo todo. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Pré-visualizar
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/painel" className="block">
            <Card padded interactive className="flex h-full flex-col gap-1">
              <span className="text-sm font-medium text-fg-primary">
                Ver como aluno
              </span>
              <span className="text-xs text-fg-tertiary">
                Abrir o portal do aluno
              </span>
            </Card>
          </Link>
          <Link href="/professor" className="block">
            <Card padded interactive className="flex h-full flex-col gap-1">
              <span className="text-sm font-medium text-fg-primary">
                Ver como professor
              </span>
              <span className="text-xs text-fg-tertiary">
                Abrir o painel do professor
              </span>
            </Card>
          </Link>
        </div>
      </section>

      <ThemeSection />
      <PasswordSection passwordFromKey="admin" />
      <SignOutSection />
    </div>
  );
}
