import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg-tertiary">
          Portal de alunos
        </span>
        <ThemeToggle />
      </header>

      <section className="flex flex-1 flex-col justify-center gap-8 py-16">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-fg-primary sm:text-5xl">
            Portal de idiomas
          </h1>
          <p className="text-lg text-fg-secondary">
            Reforço guiado de inglês e espanhol que acompanha as aulas com o seu
            professor — lições em partes curtas, exercícios autocorrigidos e
            progresso que dá vontade de continuar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Criar conta
          </Link>
        </div>

        <Card padded className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-fg-primary">
            Em construção
          </h2>
          <p className="text-sm text-fg-secondary">
            Esta é a base técnica do projeto: Next.js, design tokens com modo
            claro e escuro, e os primeiros componentes de interface. O conteúdo
            das lições chega nas próximas etapas.
          </p>
        </Card>
      </section>

      <footer className="text-sm text-fg-tertiary">
        Complementa as aulas síncronas — não substitui o professor.
      </footer>
    </main>
  );
}
