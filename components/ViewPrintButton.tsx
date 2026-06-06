"use client";

/** Imprime la vista actual (guardar como PDF desde el diálogo del navegador). */
export function ViewPrintButton({ label = "Imprimir / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ui-btn-secondary text-sm print:hidden"
    >
      {label}
    </button>
  );
}
