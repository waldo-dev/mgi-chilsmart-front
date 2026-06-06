"use client";

import type { EmbedToken } from "@/lib/types";
import { isAllowedPowerBiEmbedUrl } from "@/lib/security";
import {
  embedBackgroundType,
  embedPrintSettings,
} from "@/lib/powerBiPrint";
import {
  applyReportFit,
  embedCustomLayout,
  embedLayoutType,
  embedUrlWithPageView,
} from "@/lib/powerBiEmbed";
import dynamic from "next/dynamic";
import type { EventHandler } from "powerbi-client-react";
import type { Report } from "powerbi-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const TRIAL_BANNER_HEIGHT_PX = 20;

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
  const reportRef = useRef<Report | null>(null);
  const mobileRef = useRef(mobile);

  useEffect(() => {
    onReportReadyRef.current = onReportReady;
  }, [onReportReady]);

  useEffect(() => {
    mobileRef.current = mobile;
  }, [mobile]);

  const runFit = useCallback((report: Report) => {
    void applyReportFit(report, mobileRef.current);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeout: ReturnType<typeof setTimeout>;
    const refit = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const report = reportRef.current;
        if (report) runFit(report);
      }, 250);
    };

    window.addEventListener("resize", refit);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", refit);
    };
  }, [runFit]);

  useEffect(() => {
    return () => {
      reportRef.current = null;
      onReportReadyRef.current?.(null);
    };
  }, []);

  const eventHandlers = useMemo(() => {
    const fitFromEvent: EventHandler = (_event, embedded) => {
      const entity = embedded as Report | undefined;
      if (entity && typeof (entity as Report).print === "function") {
        runFit(entity);
      }
    };

    return new Map<string, EventHandler>([
      ["loaded", fitFromEvent],
      ["rendered", fitFromEvent],
    ]);
  }, [runFit]);

  const embedConfig = useMemo(() => {
    if (!embedUrlValid) return null;
    return {
      type: "report" as const,
      embedUrl: embedUrlWithPageView(embed.embedUrl),
      accessToken: embed.accessToken,
      tokenType: models.TokenType.Embed,
      settings: {
        panes: {
          filters: { expanded: false, visible: false },
          pageNavigation: { visible: true },
        },
        layoutType: embedLayoutType(mobile),
        customLayout: embedCustomLayout(),
        background: embedBackgroundType(),
        printSettings: embedPrintSettings(),
      },
    };
  }, [embed, embedUrlValid, mobile]);

  const handleEmbedded = (embedded: unknown) => {
    const maybeReport = embedded as Report;
    if (!maybeReport || typeof maybeReport.print !== "function") return;

    reportRef.current = maybeReport;
    onReportReadyRef.current?.(maybeReport);
    runFit(maybeReport);
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
      eventHandlers={eventHandlers}
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
            <div
              className="absolute inset-x-0"
              style={{
                top: `-${TRIAL_BANNER_HEIGHT_PX}px`,
                bottom: 0,
              }}
            >
              {reportEmbed}
            </div>
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
