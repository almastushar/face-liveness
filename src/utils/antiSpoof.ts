// Anti-spoofing detection utilities for liveness verification
// Detects photo attacks, screen presentations, and other spoofing attempts

import type { Face } from '@tensorflow-models/face-landmarks-detection';

export interface AntiSpoofState {
  frameHistory: FrameSnapshot[];
  depthVariances: number[];
  movementScores: number[];
  spoofScore: number;
  isSpoof: boolean;
  reason: string | null;
}

interface FrameSnapshot {
  timestamp: number;
  centerX: number;
  centerY: number;
  faceWidth: number;
  avgZ: number;
  zVariance: number;
}

const ANTI_SPOOF_CONFIG = {
  // History settings
  MAX_HISTORY_FRAMES: 30,
  MIN_FRAMES_FOR_CHECK: 10,
  
  // Depth analysis (photos are flat, no z-variance)
  MIN_DEPTH_VARIANCE: 0.5, // Minimum z-variance for real face
  DEPTH_CHECK_WEIGHT: 0.4,
  
  // Micro-movement analysis (real faces have subtle movements)
  MIN_MICRO_MOVEMENT: 0.3, // Minimum movement score
  MOVEMENT_CHECK_WEIGHT: 0.3,
  
  // Frame-to-frame consistency
  MAX_STATIC_FRAMES: 20, // Max frames with no movement = suspicious
  STATIC_CHECK_WEIGHT: 0.3,
  
  // Final threshold
  SPOOF_THRESHOLD: 0.6, // Above this = likely spoof
};

/**
 * Initialize anti-spoof state
 */
export function createAntiSpoofState(): AntiSpoofState {
  return {
    frameHistory: [],
    depthVariances: [],
    movementScores: [],
    spoofScore: 0,
    isSpoof: false,
    reason: null,
  };
}

/**
 * Calculate z-depth variance from face landmarks
 * Real faces have depth variation, photos/screens are flat
 */
function calculateDepthVariance(face: Face): number {
  const zValues = face.keypoints
    .filter(kp => kp.z !== undefined)
    .map(kp => kp.z as number);
  
  if (zValues.length < 50) return 0;
  
  const avgZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  const variance = zValues.reduce((sum, z) => sum + Math.pow(z - avgZ, 2), 0) / zValues.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate average z-depth
 */
function calculateAverageZ(face: Face): number {
  const zValues = face.keypoints
    .filter(kp => kp.z !== undefined)
    .map(kp => kp.z as number);
  
  if (zValues.length === 0) return 0;
  return zValues.reduce((a, b) => a + b, 0) / zValues.length;
}

/**
 * Calculate micro-movement between frames
 * Real faces have natural micro-movements, photos don't
 */
function calculateMicroMovement(current: FrameSnapshot, previous: FrameSnapshot): number {
  const dx = Math.abs(current.centerX - previous.centerX);
  const dy = Math.abs(current.centerY - previous.centerY);
  const dWidth = Math.abs(current.faceWidth - previous.faceWidth);
  const dZ = Math.abs(current.avgZ - previous.avgZ);
  
  // Normalize by face width
  const normalizedMovement = (dx + dy) / current.faceWidth;
  const normalizedScale = dWidth / current.faceWidth;
  const normalizedDepth = dZ * 10; // Scale up z differences
  
  return normalizedMovement + normalizedScale + normalizedDepth;
}

/**
 * Create a frame snapshot from face detection
 */
function createFrameSnapshot(face: Face): FrameSnapshot {
  const keypoints = face.keypoints;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  
  for (const kp of keypoints) {
    minX = Math.min(minX, kp.x);
    maxX = Math.max(maxX, kp.x);
    minY = Math.min(minY, kp.y);
    maxY = Math.max(maxY, kp.y);
    sumX += kp.x;
    sumY += kp.y;
  }
  
  return {
    timestamp: Date.now(),
    centerX: sumX / keypoints.length,
    centerY: sumY / keypoints.length,
    faceWidth: maxX - minX,
    avgZ: calculateAverageZ(face),
    zVariance: calculateDepthVariance(face),
  };
}

/**
 * Update anti-spoof state with new face detection
 */
export function updateAntiSpoofState(
  state: AntiSpoofState,
  face: Face
): AntiSpoofState {
  const snapshot = createFrameSnapshot(face);
  const newHistory = [...state.frameHistory, snapshot];
  
  // Keep only recent frames
  if (newHistory.length > ANTI_SPOOF_CONFIG.MAX_HISTORY_FRAMES) {
    newHistory.shift();
  }
  
  // Store depth variance
  const newDepthVariances = [...state.depthVariances, snapshot.zVariance];
  if (newDepthVariances.length > ANTI_SPOOF_CONFIG.MAX_HISTORY_FRAMES) {
    newDepthVariances.shift();
  }
  
  // Calculate movement if we have previous frame
  let newMovementScores = [...state.movementScores];
  if (state.frameHistory.length > 0) {
    const prevSnapshot = state.frameHistory[state.frameHistory.length - 1];
    const movement = calculateMicroMovement(snapshot, prevSnapshot);
    newMovementScores.push(movement);
    
    if (newMovementScores.length > ANTI_SPOOF_CONFIG.MAX_HISTORY_FRAMES) {
      newMovementScores.shift();
    }
  }
  
  // Check if we have enough data to analyze
  if (newHistory.length < ANTI_SPOOF_CONFIG.MIN_FRAMES_FOR_CHECK) {
    return {
      ...state,
      frameHistory: newHistory,
      depthVariances: newDepthVariances,
      movementScores: newMovementScores,
    };
  }
  
  // Analyze spoof indicators
  const { spoofScore, isSpoof, reason } = analyzeSpoof(
    newDepthVariances,
    newMovementScores
  );
  
  return {
    frameHistory: newHistory,
    depthVariances: newDepthVariances,
    movementScores: newMovementScores,
    spoofScore,
    isSpoof,
    reason,
  };
}

/**
 * Analyze collected data for spoof indicators
 */
function analyzeSpoof(
  depthVariances: number[],
  movementScores: number[]
): { spoofScore: number; isSpoof: boolean; reason: string | null } {
  let totalScore = 0;
  let reasons: string[] = [];
  
  // 1. Depth variance check - photos are flat
  const avgDepthVariance = depthVariances.reduce((a, b) => a + b, 0) / depthVariances.length;
  if (avgDepthVariance < ANTI_SPOOF_CONFIG.MIN_DEPTH_VARIANCE) {
    totalScore += ANTI_SPOOF_CONFIG.DEPTH_CHECK_WEIGHT;
    reasons.push('Flat face detected (no depth)');
  }
  
  // 2. Micro-movement check - photos don't move naturally
  if (movementScores.length > 5) {
    const avgMovement = movementScores.reduce((a, b) => a + b, 0) / movementScores.length;
    if (avgMovement < ANTI_SPOOF_CONFIG.MIN_MICRO_MOVEMENT / 100) {
      totalScore += ANTI_SPOOF_CONFIG.MOVEMENT_CHECK_WEIGHT;
      reasons.push('No natural micro-movements');
    }
  }
  
  // 3. Static frame check - too still = suspicious
  if (movementScores.length >= ANTI_SPOOF_CONFIG.MAX_STATIC_FRAMES) {
    const recentMovements = movementScores.slice(-ANTI_SPOOF_CONFIG.MAX_STATIC_FRAMES);
    const staticFrames = recentMovements.filter(m => m < 0.001).length;
    if (staticFrames > ANTI_SPOOF_CONFIG.MAX_STATIC_FRAMES * 0.8) {
      totalScore += ANTI_SPOOF_CONFIG.STATIC_CHECK_WEIGHT;
      reasons.push('Face too static');
    }
  }
  
  const isSpoof = totalScore >= ANTI_SPOOF_CONFIG.SPOOF_THRESHOLD;
  const reason = reasons.length > 0 ? reasons[0] : null;
  
  return { spoofScore: totalScore, isSpoof, reason };
}

/**
 * Reset anti-spoof state
 */
export function resetAntiSpoofState(): AntiSpoofState {
  return createAntiSpoofState();
}

/**
 * Get debug info for anti-spoof state
 */
export function getAntiSpoofDebugInfo(state: AntiSpoofState): {
  frameCount: number;
  avgDepthVariance: number;
  avgMovement: number;
  spoofScore: number;
  isSpoof: boolean;
} {
  const avgDepthVariance = state.depthVariances.length > 0
    ? state.depthVariances.reduce((a, b) => a + b, 0) / state.depthVariances.length
    : 0;
  
  const avgMovement = state.movementScores.length > 0
    ? state.movementScores.reduce((a, b) => a + b, 0) / state.movementScores.length
    : 0;
  
  return {
    frameCount: state.frameHistory.length,
    avgDepthVariance,
    avgMovement,
    spoofScore: state.spoofScore,
    isSpoof: state.isSpoof,
  };
}
