import type { Report } from "powerbi-client";
import { models } from "powerbi-client";

type ReportWithSettings = Report & {
  updateSettings?: (settings: models.ISettings) => Promise<unknown>;
};

/** Ajustes recomendados por Microsoft para imprimir con colores de fondo del reporte. */
export async function applyPrintFriendlySettings(report: Report) {
  const r = report as ReportWithSettings;
  if (typeof r.updateSettings !== "function") return;
  await r.updateSettings({
    background: models.BackgroundType.Default,
    printSettings: {
      browserPrintAdjustmentsMode: models.BrowserPrintAdjustmentsMode.Default,
    },
    customLayout: {
      displayOption: models.DisplayOption.FitToWidth,
    },
  });
}

export function embedBackgroundType() {
  return process.env.NEXT_PUBLIC_PBI_EMBED_BACKGROUND === "transparent"
    ? models.BackgroundType.Transparent
    : models.BackgroundType.Default;
}

export function embedPrintSettings(): models.IPrintSettings {
  return {
    browserPrintAdjustmentsMode: models.BrowserPrintAdjustmentsMode.Default,
  };
}
