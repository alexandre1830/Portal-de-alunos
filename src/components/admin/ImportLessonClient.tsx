"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { commitImportedDraft } from "@/lib/admin/import";
import { draftLesson, type DraftLesson } from "@/lib/blocks/schemas";
import { createClient } from "@/lib/supabase/browser";

type Stage = "pick" | "loading" | "preview" | "error";

interface Props {
  lessonId: string;
  courseLanguage: "en" | "es";
  existingPartsCount: number;
}

// Importação de PDF (admin):
// 1) Admin escolhe um PDF; extraímos texto via pdfjs no browser.
// 2) Mandamos para a Edge Function import_lesson; ela retorna o draft.
// 3) Resumo (partes/blocos) + confirmação. Ajustes finos vão para a tela
//    normal de edição da lição depois de importado.
export function ImportLessonClient({
  lessonId,
  courseLanguage,
  existingPartsCount,
}: Props) {
  const [stage, setStage] = useState<Stage>("pick");
  const [draft, setDraft] = useState<DraftLesson | null>(null);
  const [draftJson, setDraftJson] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pdfName, setPdfName] = useState<string>("");

  async function handlePdf(file: File) {
    setStage("loading");
    setError("");
    setPdfName(file.name);

    try {
      const text = await extractPdfText(file);
      if (!text || text.length < 200) {
        throw new Error("Não foi possível extrair texto do PDF (vazio ou ilegível).");
      }

      const supabase = createClient();
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "import_lesson",
        { body: { text, languageCode: courseLanguage } },
      );
      if (invokeErr || !data?.draft) {
        throw new Error(invokeErr?.message ?? "Falha ao gerar o draft.");
      }

      const parsed = draftLesson.safeParse(data.draft);
      if (!parsed.success) {
        throw new Error(
          "O modelo retornou um JSON fora do esquema. Veja o draft cru e edite manualmente antes de confirmar.",
        );
      }

      setDraft(parsed.data);
      setDraftJson(JSON.stringify(parsed.data, null, 2));
      setStage("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
      setStage("error");
    }
  }

  if (stage === "loading") {
    return (
      <Card padded>
        <p className="text-sm text-fg-secondary">
          Extraindo texto do PDF e estruturando com a Claude API… isso pode
          levar 10-30 segundos.
        </p>
        {pdfName && (
          <p className="mt-2 text-xs text-fg-tertiary">{pdfName}</p>
        )}
      </Card>
    );
  }

  if (stage === "pick" || stage === "error") {
    return (
      <div className="flex flex-col gap-4">
        <Card padded className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-fg-primary">
            Selecionar PDF
          </h2>
          <p className="text-sm text-fg-secondary">
            O texto é extraído no seu navegador (o PDF não é enviado ao servidor).
            A estruturação em partes e blocos é feita por uma chamada à Claude API.
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePdf(file);
            }}
            className="text-sm text-fg-primary"
          />
          {existingPartsCount > 0 && (
            <p className="text-xs text-warning">
              Atenção: esta lição já tem {existingPartsCount}{" "}
              {existingPartsCount === 1 ? "parte" : "partes"}. Ao confirmar a
              importação, elas serão substituídas pelo conteúdo do PDF.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </Card>
      </div>
    );
  }

  // preview
  return (
    <div className="flex flex-col gap-4">
      <Card padded className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-fg-primary">Resumo</h2>
        <p className="text-sm text-fg-secondary">
          {draft?.parts.length}{" "}
          {draft?.parts.length === 1 ? "parte" : "partes"} estruturadas a partir
          de <strong>{pdfName}</strong>.
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          {draft?.parts.map((p, i) => (
            <li key={i}>
              <span className="text-fg-primary">{p.title}</span>{" "}
              {p.kind === "golden" && (
                <span className="text-xs text-warning">(dourada)</span>
              )}{" "}
              · {p.blocks.length}{" "}
              {p.blocks.length === 1 ? "bloco" : "blocos"}
            </li>
          ))}
        </ul>
      </Card>

      <form action={commitImportedDraft} className="flex flex-col gap-3">
        <input type="hidden" name="lesson_id" value={lessonId} />
        <input type="hidden" name="draft" value={draftJson} />
        <input
          type="text"
          name="lesson_title"
          defaultValue={draft?.lesson_title ?? ""}
          placeholder="Título da lição (opcional — atualiza se preenchido)"
          className="h-10 w-full rounded-md border border-border-primary bg-bg-primary px-3 text-sm text-fg-primary"
        />
        <p className="text-xs text-fg-tertiary">
          Depois de importar você pode ajustar cada bloco na tela da lição.
        </p>
        <Button
          type="submit"
          variant="primary"
          onClick={(e) => {
            if (existingPartsCount > 0) {
              const ok = confirm(
                `Substituir as ${existingPartsCount} parte(s) atuais pelo conteúdo importado?`,
              );
              if (!ok) e.preventDefault();
            }
          }}
          className="self-start"
        >
          Confirmar e importar
        </Button>
      </form>
    </div>
  );
}

// --- Extração de texto do PDF no browser via pdfjs-dist ---
async function extractPdfText(file: File): Promise<string> {
  // Importação dinâmica — só roda no client, fora do bundle inicial.
  const pdfjs = await import("pdfjs-dist");
  // Worker servido a partir de /public (copiado de node_modules).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    parts.push(text);
  }
  return parts.join("\n\n");
}
