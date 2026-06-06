import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ToastViewport } from "@/components/toast/ToastViewport";

// Next 16 detecta automaticamente src/app/icon.svg como favicon e
// publica nos cabeçalhos. Drop um src/app/icon.png 512x512 ao lado
// para também atender Apple Touch Icon e variantes de alta densidade.
export const metadata: Metadata = {
  title: {
    default: "Portal de Alunos · Mr. Dave Idiomas",
    template: "%s · Portal de Alunos",
  },
  description:
    "Portal do aluno para reforço guiado de inglês e espanhol, complementando as aulas com o professor.",
};

// Aplica o tema antes da primeira pintura para evitar flash de cor errada (FOUC).
const themeScript = `(function(){try{var t=localStorage.getItem('portal-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>{children}</ThemeProvider>
        <ToastViewport />
      </body>
    </html>
  );
}
