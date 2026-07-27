import { AdminUserDetailScreen } from "@/components/admin/admin-user-detail-screen";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  return <AdminUserDetailScreen userId={userId} />;
}
