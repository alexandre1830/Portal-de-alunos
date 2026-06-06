import Link from "next/link";

import { Card } from "@/components/ui/Card";
import {
  PasswordSection,
  SignOutSection,
  ThemeSection,
} from "@/components/shared/SettingsSections";
import { requireTeacher } from "@/lib/professor/guard";

// Configurações do professor. Mesma estrutura do admin, mas só com
// "Ver como aluno" (o professor não tem painel separado de admin).
export default async function ProfessorConfiguracoesPage() {
  await requireTeacher();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg-primary">Configurações</h1>
        <p className="text-sm text-fg-secondary">
          Ajuste a aparência, sua senha e gerencie a sessão. Pré-visualize
          o portal como aluno abaixo.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">
          Pré-visualizar
        </h2>
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
      </section>

      <ThemeSection />
      <PasswordSection passwordFromKey="professor" />
      <SignOutSection />
    </div>
  );
}
