"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const SECTIONS = [
  { label: "Início", href: "/admin", exact: true },
  { label: "Cursos", href: "/admin/cursos" },
  { label: "Alunos", href: "/admin/alunos" },
] as const;

// Nav superior do admin. Marca a seção ativa pelo prefixo da rota,
// exceto "Início" que precisa de match exato (senão acende sempre).
export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex items-center gap-1">
      {SECTIONS.map((s) => {
        const exact = "exact" in s && s.exact;
        const active = exact ? pathname === s.href : pathname.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-bg-secondary text-fg-primary"
                : "text-fg-secondary hover:bg-bg-secondary hover:text-fg-primary",
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
