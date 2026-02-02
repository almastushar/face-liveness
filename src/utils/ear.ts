// Eye Aspect Ratio (EAR) calculation for blink detection

import type { Face } from '@tensorflow-models/face-landmarks-detection';
import { getLandmark, LANDMARK_INDICES } from './landmarks';

/**
 * Calculate Eye Aspect Ratio (EAR) for one eye
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 * where p1-p6 are the eye landmarks going clockwise from outer corner
 */
function calculateSingleEyeEAR(
  p1: [number, number, number], // outer corner
  p2: [number, number, number], // upper outer
  p3: [number, number, number], // upper inner
  p4: [number, number, number], // inner corner
  p5: [number, number, number], // lower inner
  p6: [number, number, number]  // lower outer
): number {
  // Vertical distances
  const v1 = Math.sqrt(
    Math.pow(p2[0] - p6[0], 2) + Math.pow(p2[1] - p6[1], 2)
  );
  const v2 = Math.sqrt(
    Math.pow(p3[0] - p5[0], 2) + Math.pow(p3[1] - p5[1], 2)
  );
  
  // Horizontal distance
  const h = Math.sqrt(
    Math.pow(p1[0] - p4[0], 2) + Math.pow(p1[1] - p4[1], 2)
  );
  
  if (h === 0) return 0;
  
  return (v1 + v2) / (2 * h);
}

/**
 * Calculate left eye EAR
 * Using MediaPipe FaceMesh indices for left eye
 */
export function calculateLeftEAR(face: Face): number {
  // Left eye landmarks (outer to inner, top and bottom)
  const p1 = getLandmark(face, 33);   // outer corner
  const p2 = getLandmark(face, 160);  // upper outer
  const p3 = getLandmark(face, 158);  // upper inner
  const p4 = getLandmark(face, 133);  // inner corner
  const p5 = getLandmark(face, 153);  // lower inner
  const p6 = getLandmark(face, 144);  // lower outer
  
  return calculateSingleEyeEAR(p1, p2, p3, p4, p5, p6);
}

/**
 * Calculate right eye EAR
 * Using MediaPipe FaceMesh indices for right eye
 */
export function calculateRightEAR(face: Face): number {
  // Right eye landmarks (outer to inner, top and bottom)
  const p1 = getLandmark(face, 263);  // outer corner
  const p2 = getLandmark(face, 387);  // upper outer
  const p3 = getLandmark(face, 385);  // upper inner
  const p4 = getLandmark(face, 362);  // inner corner
  const p5 = getLandmark(face, 380);  // lower inner
  const p6 = getLandmark(face, 373);  // lower outer
  
  return calculateSingleEyeEAR(p1, p2, p3, p4, p5, p6);
}

/**
 * Calculate average EAR for both eyes
 */
export function calculateAverageEAR(face: Face): { left: number; right: number; avg: number } {
  const left = calculateLeftEAR(face);
  const right = calculateRightEAR(face);
  const avg = (left + right) / 2;
  
  return { left, right, avg };
}

/**
 * Determine eye state based on EAR and threshold
 */
export function getEyeState(
  currentEAR: number,
  openBaseline: number,
  closedThresholdRatio: number = 0.65
): 'OPEN' | 'CLOSED' | 'UNKNOWN' {
  if (openBaseline === 0) return 'UNKNOWN';
  
  const threshold = openBaseline * closedThresholdRatio;
  
  if (currentEAR < threshold) {
    return 'CLOSED';
  }
  return 'OPEN';
}
