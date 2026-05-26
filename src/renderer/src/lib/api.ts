/** Typed access to the preload bridge; returns null if preload failed to load. */
export function getJsonifeApi(): Window['jsonife'] | null {
  return window.jsonife ?? null
}
