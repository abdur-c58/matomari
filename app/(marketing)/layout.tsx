import type { Metadata } from "next";
import "@/components/marketing/marketing.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants/branding";

export const metadata: Metadata = {
  title: `${APP_NAME} — Japanese for real use`,
  description: APP_DESCRIPTION,
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthProvider>{children}</AuthProvider>;
}
