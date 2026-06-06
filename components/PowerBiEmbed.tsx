"use client";

import type { EmbedToken } from "@/lib/types";
import { isAllowedPowerBiEmbedUrl } from "@/lib/security";
import {
  embedBackgroundType,
  embedPrintSettings,
} from "@/lib/powerBiPrint";
import dynamic from "next/dynamic";
import type { Report } from "powerbi-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { models } from "powerbi-client";

const PowerBIEmbed = dynamic(
  () => import("powerbi-client-react").then((m) => m.PowerBIEmbed),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[inherit] items-center justify-center bg-zinc-100">
        <p className="ui-muted">Cargando reporte…</p>
      </div>
    ),
  },
);

/** Altura aprox. del banner gris de trial en el iframe de Power BI. */
const TRIAL_BANNER_HEIGHT_PX = 20;

/** Recorta visualmente el banner; desactivar con NEXT_PUBLIC_HIDE_PBI_LICENSE_BANNER=false cuando haya capacidad Premium. */
const clipTrialBanner =
  process.env.NEXT_PUBLIC_HIDE_PBI_LICENSE_BANNER !== "false";

interface PowerBiEmbedProps {
  embed: EmbedToken;
  className?: string;
  onReportReady?: (report: Report | null) => void;
}

function useMobileLayout() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return mobile;
}

export function PowerBiEmbed({ embed, className, onReportReady }: PowerBiEmbedProps) {
  const mobile = useMobileLayout();
  const embedUrlValid = isAllowedPowerBiEmbedUrl(embed.embedUrl);
  const onReportReadyRef = useRef(onReportReady);

  useEffect(() => {
    onReportReadyRef.current = onReportReady;
  }, [onReportReady]);

  useEffect(() => {
    return () => {
      onReportReadyRef.current?.(null);
    };
  }, []);

  const embedConfig = useMemo(() => {
    if (!embedUrlValid) return null;
    return {
      type: "report" as const,
      embedUrl: embed.embedUrl,
      accessToken: embed.accessToken,
      tokenType: models.TokenType.Embed,
      settings: {
        panes: {
          filters: { expanded: false, visible: false },
          pageNavigation: { visible: true },
        },
        layoutType: mobile
          ? models.LayoutType.MobilePortrait
          : models.LayoutType.Master,
        customLayout: {
          // FitToWidth deja visible la barra de páginas inferior; FitToPage puede ocultarla en contenedores bajos.
          displayOption: models.DisplayOption.FitToWidth,
        },
        background: embedBackgroundType(),
        printSettings: embedPrintSettings(),
      },
    };
  }, [embed, embedUrlValid, mobile]);

  const handleEmbedded = (embedded: unknown) => {
    const maybeReport = embedded as Report;
    if (maybeReport && typeof maybeReport.print === "function") {
      onReportReadyRef.current?.(maybeReport);
    }
  };

  if (!embedConfig) {
    return (
      <div className="ui-alert-error">
        URL de embed no permitida. Contacta al administrador.
      </div>
    );
  }

  const reportEmbed = (
    <PowerBIEmbed
      embedConfig={embedConfig}
      cssClassName="h-full w-full"
      getEmbeddedComponent={handleEmbedded}
    />
  );

  return (
    <div
      className={
        className ??
        "h-[calc(100dvh-10.5rem)] min-h-[420px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm sm:h-[calc(100dvh-12rem)] sm:min-h-[520px] lg:min-h-[600px]"
      }
    >
      <div
        className="relative h-full w-full bg-white"
        style={{ colorScheme: "light" }}
      >
        {clipTrialBanner ? (
          <>
            {/*
              Oculta solo el banner superior: anclar abajo evita recortar la barra de páginas.
              marginTop + height % suele perder los ~44 px inferiores con overflow-hidden.
            */}
            <div
              className="absolute inset-x-0"
              style={{
                top: `-${TRIAL_BANNER_HEIGHT_PX}px`,
                bottom: 0,
              }}
            >
              {reportEmbed}
            </div>
            {/* Tapa el borde superior por si el recorte deja un halo del banner */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-white"
              style={{ height: `${TRIAL_BANNER_HEIGHT_PX}px` }}
              aria-hidden
            />
          </>
        ) : (
          reportEmbed
        )}
      </div>
    </div>
  );
}
