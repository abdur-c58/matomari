export function isPageGradientEnabled(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  if (pathname === "/") return false;

  if (pathname.startsWith("/recall")) return false;

  if (pathname.startsWith("/listen")) {
    return searchParams.get("step") !== "shadow";
  }

  return true;
}
