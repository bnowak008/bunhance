import type { EasingFunction } from '../types/animation';

export const defaultEasing: EasingFunction = (t: number) => t;

export const easeInQuad: EasingFunction = (t: number) => t * t;
export const easeOutQuad: EasingFunction = (t: number) => t * (2 - t);
export const easeInOutQuad: EasingFunction = (t: number) => 
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const easeInCubic: EasingFunction = (t: number) => t * t * t;
export const easeOutCubic: EasingFunction = (t: number) => (--t) * t * t + 1;
export const easeInOutCubic: EasingFunction = (t: number) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

export const easeInElastic: EasingFunction = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};

export const easeOutElastic: EasingFunction = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}; 