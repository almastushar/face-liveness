// Head pose estimation utilities using normalized metrics

import type { Face } from '@tensorflow-models/face-landmarks-detection';
import { getLandmark, LANDMARK_INDICES, calculateBoundingBox, getInterOcularDistance } from './landmarks';

export interface PoseMetrics {
  yawMetric: number;   // Normalized yaw (-1 to 1, negative = left, positive = right)
  pitchMetric: number; // Normalized pitch (-1 to 1, negative = up, positive = down)
  rollMetric: number;  // Normalized roll (-1 to 1)
  faceWidth: number;
  faceHeight: number;
}

/**
 * Calculate normalized yaw metric based on nose position relative to face center
 * Uses ratio-based calculation that's independent of face size/distance
 */
function calculateYawMetric(face: Face): number {
  const noseTip = getLandmark(face, LANDMARK_INDICES.NOSE_TIP);
  const leftCheek = getLandmark(face, LANDMARK_INDICES.LEFT_CHEEK);
  const rightCheek = getLandmark(face, LANDMARK_INDICES.RIGHT_CHEEK);
  
  // Calculate midpoint between cheeks
  const midCheekX = (leftCheek[0] + rightCheek[0]) / 2;
  
  // Face width for normalization
  const faceWidth = Math.abs(rightCheek[0] - leftCheek[0]);
  
  if (faceWidth === 0) return 0;
  
  // Yaw metric: how far nose is from center, normalized by face width
  // Invert because camera is mirrored (scaleX(-1)) - user's left should match screen left
  // Negative = looking left, Positive = looking right (from user's perspective)
  const yawMetric = -((noseTip[0] - midCheekX) / faceWidth);
  
  return yawMetric;
}

/**
 * Calculate normalized pitch metric based on nose position relative to eye line
 * Uses ratio-based calculation that's independent of face size/distance
 */
function calculatePitchMetric(face: Face): number {
  const noseTip = getLandmark(face, LANDMARK_INDICES.NOSE_TIP);
  const leftEyeInner = getLandmark(face, LANDMARK_INDICES.LEFT_EYE_INNER);
  const rightEyeInner = getLandmark(face, LANDMARK_INDICES.RIGHT_EYE_INNER);
  const chin = getLandmark(face, LANDMARK_INDICES.CHIN);
  const forehead = getLandmark(face, LANDMARK_INDICES.FOREHEAD);
  
  // Eye line Y coordinate (average of inner eye corners)
  const eyeLineY = (leftEyeInner[1] + rightEyeInner[1]) / 2;
  
  // Face height for normalization
  const faceHeight = Math.abs(chin[1] - forehead[1]);
  
  if (faceHeight === 0) return 0;
  
  // Pitch metric: nose position relative to eye line, normalized by face height
  // Negative = looking up, Positive = looking down
  const pitchMetric = (noseTip[1] - eyeLineY) / faceHeight;
  
  return pitchMetric;
}

/**
 * Calculate normalized roll metric based on eye line angle
 */
function calculateRollMetric(face: Face): number {
  const leftEyeOuter = getLandmark(face, LANDMARK_INDICES.LEFT_EYE_OUTER);
  const rightEyeOuter = getLandmark(face, LANDMARK_INDICES.RIGHT_EYE_OUTER);
  
  const dx = rightEyeOuter[0] - leftEyeOuter[0];
  const dy = rightEyeOuter[1] - leftEyeOuter[1];
  
  // Roll angle in radians, then normalize to roughly -1 to 1 range
  const rollAngle = Math.atan2(dy, dx);
  
  // Normalize: typical head tilt is within ±30 degrees (±0.52 radians)
  const rollMetric = rollAngle / 0.52;
  
  return rollMetric;
}

/**
 * Calculate all pose metrics for a face
 */
export function calculatePoseMetrics(face: Face): PoseMetrics {
  const bbox = calculateBoundingBox(face);
  
  return {
    yawMetric: calculateYawMetric(face),
    pitchMetric: calculatePitchMetric(face),
    rollMetric: calculateRollMetric(face),
    faceWidth: bbox.width,
    faceHeight: bbox.height,
  };
}

/**
 * Check if pose delta meets threshold for a specific direction
 */
export function checkPoseDirection(
  currentMetric: number,
  baselineMetric: number,
  threshold: number,
  direction: 'negative' | 'positive'
): boolean {
  const delta = currentMetric - baselineMetric;
  
  if (direction === 'negative') {
    return delta <= -threshold;
  } else {
    return delta >= threshold;
  }
}

/**
 * Get yaw delta from baseline
 */
export function getYawDelta(current: number, baseline: number): number {
  return current - baseline;
}

/**
 * Get pitch delta from baseline
 */
export function getPitchDelta(current: number, baseline: number): number {
  return current - baseline;
}

/**
 * Check if roll is within acceptable range (not tilted too much)
 */
export function isRollAcceptable(rollMetric: number, threshold: number = 0.15): boolean {
  return Math.abs(rollMetric) <= threshold;
}
