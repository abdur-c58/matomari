export type PwaInstallPlatform = "standalone" | "ios" | "android" | "desktop";

export type PwaInstallHint = {
  platform: PwaInstallPlatform;
  title: string;
  steps: string[];
};

export function detectPwaInstallPlatform(): PwaInstallPlatform {
  if (typeof window === "undefined") return "desktop";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (standalone) return "standalone";

  const ua = window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

  if (isIos) return "ios";

  if (/Android/i.test(ua)) return "android";

  return "desktop";
}

export function getPwaInstallHint(platform: PwaInstallPlatform): PwaInstallHint {
  switch (platform) {
    case "standalone":
      return {
        platform,
        title: "Already on your home screen",
        steps: [
          "Matomari is running as an installed app — you're set up for the best experience.",
          "Open it from your home screen anytime for full-screen study and smoother audio.",
        ],
      };
    case "ios":
      return {
        platform,
        title: "Add Matomari to your home screen",
        steps: [
          "Tap the Share button in Safari (the square with an arrow).",
          "Scroll down and tap Add to Home Screen.",
          "Tap Add — Matomari will open full-screen like a native app.",
        ],
      };
    case "android":
      return {
        platform,
        title: "Install Matomari on your home screen",
        steps: [
          "Tap the menu (⋮) in Chrome, or look for Install app in the address bar.",
          "Choose Add to Home screen or Install.",
          "Open Matomari from your home screen for the best study experience.",
        ],
      };
    default:
      return {
        platform,
        title: "Bookmark or install Matomari",
        steps: [
          "On mobile, add www.matomari.com to your home screen for full-screen study and better audio.",
          "On desktop, bookmark the site or use your browser's Install app option if offered.",
        ],
      };
  }
}
