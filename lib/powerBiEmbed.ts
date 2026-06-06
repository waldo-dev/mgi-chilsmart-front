import type { Report } from "powerbi-client";
import { models } from "powerbi-client";

type ReportFitCapable = Report & {
  updateSettings?: (settings: models.ISettings) => Promise<unknown>;
  setPageView?: (view: string) => Promise<unknown>;
};

/**
 * FitToPage solo aplica de forma fiable con layoutType Custom (no Master).
 * Encaja la página al iframe = ver el reporte completo sin alejar zoom manual.
 */
export function embedDisplayOption(): models.DisplayOption {
  const mode = process.env.NEXT_PUBLIC_PBI_DISPLAY?.trim().toLowerCase();

  if (mode === "fittopage") return models.DisplayOption.FitToPage;
  if (mode === "fittowidth") return models.DisplayOption.FitToWidth;
  if (mode === "actualsize") return models.DisplayOption.ActualSize;

  return models.DisplayOption.FitToPage;
}

export function embedLayoutType(_mobile: boolean): models.LayoutType {
  return models.LayoutType.Custom;
}

export function embedCustomLayout(): models.ICustomLayout {
  return {
    displayOption: embedDisplayOption(),
  };
}

export function embedFitSettings(mobile: boolean): models.ISettings {
  return {
    layoutType: embedLayoutType(mobile),
    customLayout: embedCustomLayout(),
  };
}

/** Algunos tenants respetan pageView en la URL del embed. */
export function embedUrlWithPageView(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    if (!url.searchParams.has("pageView")) {
      url.searchParams.set("pageView", "fitToPage");
    }
    return url.toString();
  } catch {
    return embedUrl;
  }
}

const FIT_DELAYS_MS = [0, 350, 900, 1800] as const;

export async function applyReportFit(report: Report, mobile: boolean) {
  const r = report as ReportFitCapable;
  const settings = embedFitSettings(mobile);

  for (const delay of FIT_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      await r.updateSettings?.(settings);
    } catch {
      /* siguiente intento */
    }

    try {
      await r.setPageView?.("fitToPage");
    } catch {
      /* API opcional según versión del SDK */
    }
  }
}
