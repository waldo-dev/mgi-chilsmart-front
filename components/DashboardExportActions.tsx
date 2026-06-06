"use client";

import { downloadTextFile, safeFileName } from "@/lib/download";
import { applyPrintFriendlySettings } from "@/lib/powerBiPrint";
import type { Report } from "powerbi-client";
import { useState } from "react";

type ReportExportable = Report & {
  exportData?: () => Promise<string | { data: string }>;
};

interface DashboardExportActionsProps {
  report: Report | null;
  reportName: string;
  reportReady: boolean;
}

export function DashboardExportActions({
  report,
  reportName,
  reportReady,
}: DashboardExportActionsProps) {
  const [busy, setBusy] = useState<"print" | "data" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = !reportReady || !report || busy !== null;

  async function handlePrint() {
    if (!report) return;
    setError(null);
    setBusy("print");
    try {
      await applyPrintFriendlySettings(report);
      await new Promise((r) => setTimeout(r, 400));
      await report.print();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir la impresión del reporte",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleExportData() {
    if (!report) return;
    const exportable = report as ReportExportable;
    if (typeof exportable.exportData !== "function") {
      setError("Exportación de datos no habilitada en este reporte.");
      return;
    }
    setError(null);
    setBusy("data");
    try {
      const result = await exportable.exportData();
      const data =
        typeof result === "string"
          ? result
          : result && typeof result === "object" && "data" in result
            ? String((result as { data: string }).data)
            : "";
      if (!data) {
        setError("El reporte no devolvió datos exportables.");
        return;
      }
      const base = safeFileName(reportName);
      downloadTextFile(`${base}-datos.csv`, data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Exportación de datos no disponible para este reporte",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handlePrint}
          className="ui-btn-secondary text-sm"
          title="Abre el diálogo de impresión; puedes guardar como PDF"
        >
          {busy === "print" ? "Preparando…" : "Imprimir / PDF"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleExportData}
          className="ui-btn-secondary text-sm"
          title="Descarga los datos del reporte en CSV"
        >
          {busy === "data" ? "Exportando…" : "Exportar datos (CSV)"}
        </button>
      </div>
      {!reportReady ? (
        <p className="ui-meta text-right">Cargando reporte para exportar…</p>
      ) : (
        <p className="ui-meta max-w-sm text-right">
          Al guardar PDF, activa <strong>Gráficos de fondo</strong> en el
          diálogo de impresión del navegador.
        </p>
      )}
      {error ? <p className="ui-alert-error text-sm">{error}</p> : null}
    </div>
  );
}
