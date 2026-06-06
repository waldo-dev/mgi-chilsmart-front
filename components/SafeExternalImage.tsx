"use client";

import { isAllowedLogoUrl } from "@/lib/security";

interface SafeExternalImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/** Imagen externa con validación de URL https y referrerPolicy restrictivo. */
export function SafeExternalImage(props: SafeExternalImageProps) {
  if (!isAllowedLogoUrl(props.src)) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={props.alt}
      className={props.className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
    />
  );
}
