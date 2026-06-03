"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const TABS = [
  { label: "Módulos", segment: "modulos" },
  { label: "Matrículas", segment: "matriculas" },
  { label: "Config", segment: "config" },
] as const;

// Abas dentro do curso. Cada aba tem rota própria (linkável e previsível).
export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      role="tablist"
      className="flex border-b border-border-primary"
      aria-label="Seções do curso"
    >
      {TABS.map((t) => {
        const href = `/admin/cursos/${courseId}/${t.segment}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={t.segment}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-fg-primary text-fg-primary"
                : "border-transparent text-fg-secondary hover:text-fg-primary",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
