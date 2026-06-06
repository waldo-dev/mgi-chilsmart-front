import { Suspense } from "react";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-zinc-500">Cargando…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
