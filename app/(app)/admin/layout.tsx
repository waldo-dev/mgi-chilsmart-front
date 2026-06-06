import { RequireRole } from "@/components/RequireRole";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole admin>{children}</RequireRole>;
}
