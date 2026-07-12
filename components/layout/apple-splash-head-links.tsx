import {
  APPLE_SPLASH_SCREENS,
  splashImagePath,
  type SplashTheme,
} from "@/lib/constants/apple-splash-screens";

const THEMES: SplashTheme[] = ["light", "dark"];

export function AppleSplashHeadLinks() {
  return (
    <>
      {THEMES.flatMap((theme) =>
        APPLE_SPLASH_SCREENS.map((screen) => (
          <link
            key={`${theme}-${screen.id}`}
            rel="apple-touch-startup-image"
            href={splashImagePath(theme, screen.id)}
            media={`(prefers-color-scheme: ${theme}) and ${screen.media}`}
          />
        ))
      )}
    </>
  );
}
