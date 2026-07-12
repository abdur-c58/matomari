/** Apple PWA splash screens — logical size × DPR = PNG dimensions. */
export type AppleSplashScreen = {
  /** Filename segment, e.g. 1170x2532 */
  id: string;
  width: number;
  height: number;
  media: string;
};

function portraitMedia(logicalW: number, logicalH: number, dpr: number): string {
  return `(device-width: ${logicalW}px) and (device-height: ${logicalH}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`;
}

function landscapeMedia(logicalW: number, logicalH: number, dpr: number): string {
  return `(device-width: ${logicalW}px) and (device-height: ${logicalH}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: landscape)`;
}

function portrait(logicalW: number, logicalH: number, dpr: number): AppleSplashScreen {
  const width = logicalW * dpr;
  const height = logicalH * dpr;
  return {
    id: `${width}x${height}`,
    width,
    height,
    media: portraitMedia(logicalW, logicalH, dpr),
  };
}

function landscape(logicalW: number, logicalH: number, dpr: number): AppleSplashScreen {
  const width = logicalH * dpr;
  const height = logicalW * dpr;
  return {
    id: `${width}x${height}`,
    width,
    height,
    media: landscapeMedia(logicalW, logicalH, dpr),
  };
}

/** iPhone + iPad portrait and iPad landscape — covers common iOS/iPadOS home-screen launches. */
export const APPLE_SPLASH_SCREENS: AppleSplashScreen[] = [
  // iPhone
  portrait(320, 568, 2),
  portrait(375, 667, 2),
  portrait(414, 896, 2),
  portrait(375, 812, 3),
  portrait(390, 844, 3),
  portrait(393, 852, 3),
  portrait(414, 896, 3),
  portrait(428, 926, 3),
  portrait(430, 932, 3),
  // iPad portrait
  portrait(768, 1024, 2),
  portrait(810, 1080, 2),
  portrait(820, 1180, 2),
  portrait(834, 1112, 2),
  portrait(834, 1194, 2),
  portrait(1024, 1366, 2),
  // iPad landscape
  landscape(768, 1024, 2),
  landscape(810, 1080, 2),
  landscape(820, 1180, 2),
  landscape(834, 1112, 2),
  landscape(834, 1194, 2),
  landscape(1024, 1366, 2),
];

export type SplashTheme = "light" | "dark";

export function splashImagePath(theme: SplashTheme, id: string): string {
  return `/splash/${theme}/${id}.png`;
}
