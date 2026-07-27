import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-staff";
import { AdminHealthScreen } from "@/components/admin/admin-health-screen";

export default async function AdminHealthPage() {
  const staff = await requireAdminSession();
  if (!staff.ok) notFound();
  return <AdminHealthScreen />;
}
