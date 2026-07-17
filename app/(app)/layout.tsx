import { AppProvider } from "@/components/providers/app-provider";
import { UiFontProvider } from "@/components/providers/ui-font-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AuthGate } from "@/components/auth/auth-gate";
import { TutorProvider } from "@/components/ai/tutor-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { UploadProgressBar } from "@/components/layout/upload-progress-bar";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { GlobalAudioPlayer } from "@/components/audio/global-audio-player";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <AuthGate>
        <AppProvider>
          <UiFontProvider>
            <NotificationProvider>
              <UploadProgressBar />
              <OnboardingProvider>
                <TutorProvider>
                  <AppShell>{children}</AppShell>
                </TutorProvider>
              </OnboardingProvider>
              <GlobalAudioPlayer />
              <Toaster />
            </NotificationProvider>
          </UiFontProvider>
        </AppProvider>
      </AuthGate>
    </AuthProvider>
  );
}
