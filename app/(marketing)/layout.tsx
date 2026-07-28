import type { Metadata } from "next";
import "@/components/marketing/marketing.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { MarketingCursorMount } from "@/components/marketing/marketing-cursor-mount";
import { StandaloneAuthRedirect } from "@/components/pwa/standalone-auth-redirect";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants/branding";

export const metadata: Metadata = {
  title: `${APP_NAME} — Home`,
  description: APP_DESCRIPTION,
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <StandaloneAuthRedirect />
      <MarketingCursorMount />
      {children}
    </AuthProvider>
  );
}
