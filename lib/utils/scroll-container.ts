export function getAppScrollContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("scrollable-content");
}

export function getAppScrollTargets(): Array<HTMLElement | Window> {
  const targets: Array<HTMLElement | Window> = [window];
  const root = getAppScrollContainer();
  if (root) targets.unshift(root);
  return targets;
}
