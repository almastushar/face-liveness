// Exponential Moving Average smoothing utilities

/**
 * Calculate EMA with given alpha
 * @param current Current value
 * @param previous Previous EMA value
 * @param alpha Smoothing factor (0-1), higher = more responsive
 */
export function ema(current: number, previous: number, alpha: number = 0.3): number {
  if (previous === 0 || isNaN(previous)) {
    return current;
  }
  return alpha * current + (1 - alpha) * previous;
}

/**
 * Calculate simple moving average from array
 */
export function sma(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Check if value is within range
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
