import { notFound } from "next/navigation";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { AdminSupportScreen } from "@/components/admin/admin-support-screen";

export default async function AdminSupportPage() {
  const staff = await requireStaffSession();
  if (!staff.ok) notFound();
  return <AdminSupportScreen />;
}
