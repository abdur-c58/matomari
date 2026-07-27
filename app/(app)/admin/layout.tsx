import { notFound } from "next/navigation";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    notFound();
  }

  return (
    <AdminShell role={staff.role} displayName={staff.profile.displayName}>
      {children}
    </AdminShell>
  );
}
