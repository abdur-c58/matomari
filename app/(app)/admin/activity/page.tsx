import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-staff";
import { AdminActivityScreen } from "@/components/admin/admin-activity-screen";

export default async function AdminActivityPage() {
  const staff = await requireAdminSession();
  if (!staff.ok) notFound();
  return <AdminActivityScreen />;
}
