/**
 * Pure helpers for the AEGIS landing gravity field.
 *
 * The Three.js engine lives in `gravityField.ts`; everything here is
 * DOM-free so it can be unit tested with `node --test`.
 */

export interface FieldStage {
  /** Hero cluster pull (1 at the top of the page, 0 once the hero is passed). */
  hero: number;
  /** Gentle expansion while the reader moves into the product story. */
  spread: number;
  /** Gravity drop + floor bounce window. */
  descent: number;
  /** Orbit ring formation (architecture / dispatch story). */
  ring: number;
  /** Late-page halo expansion of that same ring. */
  halo: number;
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Map normalized page progress (0 at the hero, 1 at the footer) to the
 * animation story. Each value is an independent blend weight so the engine
 * can combine states without hard cuts.
 */
export function computeFieldStage(progress: number): FieldStage {
  const p = clamp01(progress);

  const hero = 1 - smoothstep(0.05, 0.2, p);
  const spread = smoothstep(0.1, 0.22, p) * (1 - smoothstep(0.3, 0.46, p));
  const descent = smoothstep(0.28, 0.4, p) * (1 - smoothstep(0.44, 0.56, p));
  const ring = smoothstep(0.52, 0.66, p);
  const halo = smoothstep(0.78, 1, p);

  return { hero, spread, descent, ring, halo };
}

/** Sphere budget, tuned for three tiers of devices. */
export function sphereCountFor(width: number): number {
  if (width < 640) return 34;
  if (width < 1024) return 54;
  return 78;
}

/**
 * Radius distribution in world units (before the viewport size factor).
 * Three deliberate size bands keep the cluster from looking uniform:
 * 26% small, 46% medium, 28% large.
 */
export function sphereRadius(tier: number, variance: number): number {
  const v = clamp01(variance);
  if (tier < 0.26) return 0.3 + v * 0.14;
  if (tier < 0.72) return 0.48 + v * 0.2;
  return 0.74 + v * 0.28;
}
