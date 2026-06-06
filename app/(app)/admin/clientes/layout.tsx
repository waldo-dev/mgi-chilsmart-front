import { RequireRole } from "@/components/RequireRole";

export default function SuperadminClientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole superadmin>{children}</RequireRole>;
}
