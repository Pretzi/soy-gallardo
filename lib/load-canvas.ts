type CanvasModule = typeof import('canvas');

let canvasModule: CanvasModule | null = null;

/** Lazy-load native canvas bindings — avoids requiring them during Next.js build. */
export async function loadCanvas(): Promise<CanvasModule> {
  if (!canvasModule) {
    canvasModule = await import('canvas');
  }
  return canvasModule;
}
