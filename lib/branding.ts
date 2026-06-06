import { isSafeBrandColor } from "@/lib/security";

/** Tu plataforma (Chilsmart). */
export const PLATFORM_NAME = "Chilsmart";
export const PLATFORM_LOGO = "/logo-chilsmart.png";
export const PLATFORM_PRIMARY = "#0099ff";
export const PLATFORM_SECONDARY = "#0066cc";

/** Logo del cliente (MGI). */
export const CLIENT_LOGO = "/logo-mgi.jpeg";
export const CLIENT_NAME = "MGI Asesorías";
export const CLIENT_PRIMARY = "#4db8e8";
export const CLIENT_SECONDARY = "#8bcb3c";

/** @deprecated usar CLIENT_LOGO */
export const PRIMARY_LOGO = CLIENT_LOGO;
export const DEFAULT_CLIENT_LOGO = CLIENT_LOGO;
export const DEFAULT_CLIENT_NAME = CLIENT_NAME;

export function resolveClientLogo(_logoUrl?: string | null): string {
  return CLIENT_LOGO;
}

export function resolveClientName(nombre?: string | null): string {
  const name = nombre?.trim();
  return name || CLIENT_NAME;
}

/** Colores del cliente en la app; en login se usa PLATFORM_PRIMARY. */
export function resolvePrimary(color?: string | null): string {
  if (color && isSafeBrandColor(color)) return color;
  return CLIENT_PRIMARY;
}

export function resolveSecondary(color?: string | null): string {
  if (color && isSafeBrandColor(color)) return color;
  return CLIENT_SECONDARY;
}

export function isLocalBrandAsset(src: string): boolean {
  return src.startsWith("/");
}
