import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border-primary">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/cursos"
              className="text-sm font-semibold text-fg-primary"
            >
              Admin · Portal
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/painel"
              className="text-sm text-fg-secondary hover:text-fg-primary"
            >
              Ver como aluno
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl px-6 py-8">{children}</div>
    </div>
  );
}
