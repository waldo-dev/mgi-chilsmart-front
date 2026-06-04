"use client";

import type { EmbedToken } from "@/lib/types";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { models } from "powerbi-client";

const PowerBIEmbed = dynamic(
  () => import("powerbi-client-react").then((m) => m.PowerBIEmbed),
  { ssr: false, loading: () => <p className="text-zinc-500">Cargando reporte…</p> },
);

interface PowerBiEmbedProps {
  embed: EmbedToken;
}

export function PowerBiEmbed({ embed }: PowerBiEmbedProps) {
  const embedConfig = useMemo(
    () => ({
      type: "report" as const,
      embedUrl: embed.embedUrl,
      accessToken: embed.accessToken,
      tokenType: models.TokenType.Embed,
      settings: {
        panes: {
          filters: { expanded: false, visible: false },
          pageNavigation: { visible: true },
        },
      },
    }),
    [embed],
  );

  return (
    <div className="h-[min(75vh,720px)] w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <PowerBIEmbed embedConfig={embedConfig} cssClassName="h-full w-full" />
    </div>
  );
}
