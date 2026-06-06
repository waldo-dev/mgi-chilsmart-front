import {
  CLIENT_LOGO,
  CLIENT_NAME,
  PLATFORM_LOGO,
  PLATFORM_NAME,
} from "@/lib/branding";
import Image from "next/image";

interface DualBrandLogosProps {
  priority?: boolean;
  variant?: "login" | "header";
}

/** Chilsmart (plataforma, destacado) + MGI (cliente, secundario). */
export function DualBrandLogos({
  priority = false,
  variant = "login",
}: DualBrandLogosProps) {
  if (variant === "header") {
    return (
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <Image
          src={PLATFORM_LOGO}
          alt={PLATFORM_NAME}
          width={340}
          height={72}
          priority
          className="h-11 w-auto max-w-[170px] object-contain sm:h-12 sm:max-w-[200px]"
        />
        <Image
          src={CLIENT_LOGO}
          alt={CLIENT_NAME}
          width={240}
          height={56}
          className="h-9 w-auto max-w-[120px] object-contain sm:h-10 sm:max-w-[140px]"
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Image
        src={PLATFORM_LOGO}
        alt={PLATFORM_NAME}
        width={420}
        height={126}
        priority={priority}
        className="h-16 w-auto max-w-[320px] object-contain sm:h-[4.5rem] sm:max-w-[380px]"
      />

      <div className="flex w-full flex-col items-center gap-2.5 border-t border-zinc-200 pt-5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Cliente
        </span>
        <Image
          src={CLIENT_LOGO}
          alt={CLIENT_NAME}
            width={340}
          height={80}
          className="h-11 w-auto max-w-[260px] object-contain sm:h-12 sm:max-w-[300px]"
        />
      </div>
    </div>
  );
}
