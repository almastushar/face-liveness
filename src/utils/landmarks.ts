// Facial landmark utilities for TensorFlow.js Face Landmarks Detection

import type { Face } from '@tensorflow-models/face-landmarks-detection';
import type { BoundingBox } from '@/types/liveness';

// MediaPipe FaceMesh landmark indices
export const LANDMARK_INDICES = {
  // Nose
  NOSE_TIP: 1,
  NOSE_BRIDGE: 6,
  
  // Left eye (from viewer's perspective, so anatomically right eye)
  LEFT_EYE: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  LEFT_EYE_UPPER: [159, 158, 157, 173, 133],
  LEFT_EYE_LOWER: [145, 144, 163, 7, 33],
  LEFT_EYE_INNER: 133,
  LEFT_EYE_OUTER: 33,
  
  // Right eye (from viewer's perspective, so anatomically left eye)
  RIGHT_EYE: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  RIGHT_EYE_UPPER: [386, 385, 384, 398, 362],
  RIGHT_EYE_LOWER: [374, 373, 390, 249, 263],
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 263,
  
  // Eyebrows
  LEFT_EYEBROW: [70, 63, 105, 66, 107],
  RIGHT_EYEBROW: [336, 296, 334, 293, 300],
  
  // Lips
  UPPER_LIP: 13,
  LOWER_LIP: 14,
  LEFT_MOUTH: 61,
  RIGHT_MOUTH: 291,
  
  // Face contour
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  CHIN: 152,
  FOREHEAD: 10,
  
  // For face bounds
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  TOP_HEAD: 10,
  BOTTOM_CHIN: 152,
};

/**
 * Get a specific landmark point from face
 */
export function getLandmark(face: Face, index: number): [number, number, number] {
  const keypoints = face.keypoints;
  if (index >= 0 && index < keypoints.length) {
    const kp = keypoints[index];
    return [kp.x, kp.y, kp.z || 0];
  }
  return [0, 0, 0];
}

/**
 * Calculate bounding box from face keypoints
 */
export function calculateBoundingBox(face: Face): BoundingBox {
  const keypoints = face.keypoints;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const kp of keypoints) {
    minX = Math.min(minX, kp.x);
    minY = Math.min(minY, kp.y);
    maxX = Math.max(maxX, kp.x);
    maxY = Math.max(maxY, kp.y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get center point of face
 */
export function getFaceCenter(face: Face): [number, number] {
  const bbox = calculateBoundingBox(face);
  return [
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height / 2,
  ];
}

/**
 * Calculate inter-ocular distance (distance between eye centers)
 */
export function getInterOcularDistance(face: Face): number {
  const leftEyeInner = getLandmark(face, LANDMARK_INDICES.LEFT_EYE_INNER);
  const leftEyeOuter = getLandmark(face, LANDMARK_INDICES.LEFT_EYE_OUTER);
  const rightEyeInner = getLandmark(face, LANDMARK_INDICES.RIGHT_EYE_INNER);
  const rightEyeOuter = getLandmark(face, LANDMARK_INDICES.RIGHT_EYE_OUTER);
  
  const leftEyeCenter = [
    (leftEyeInner[0] + leftEyeOuter[0]) / 2,
    (leftEyeInner[1] + leftEyeOuter[1]) / 2,
  ];
  
  const rightEyeCenter = [
    (rightEyeInner[0] + rightEyeOuter[0]) / 2,
    (rightEyeInner[1] + rightEyeOuter[1]) / 2,
  ];
  
  return Math.sqrt(
    Math.pow(rightEyeCenter[0] - leftEyeCenter[0], 2) +
    Math.pow(rightEyeCenter[1] - leftEyeCenter[1], 2)
  );
}

/**
 * Check if face bounding box is inside guide box with margin
 */
export function isFaceInsideGuide(
  faceBbox: BoundingBox,
  guideBox: BoundingBox,
  margin: number = 0.05
): boolean {
  const marginX = guideBox.width * margin;
  const marginY = guideBox.height * margin;
  
  return (
    faceBbox.x >= guideBox.x - marginX &&
    faceBbox.y >= guideBox.y - marginY &&
    faceBbox.x + faceBbox.width <= guideBox.x + guideBox.width + marginX &&
    faceBbox.y + faceBbox.height <= guideBox.y + guideBox.height + marginY
  );
}

/**
 * Draw face landmarks on canvas
 */
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  face: Face,
  color: string = '#00ff00',
  radius: number = 2
): void {
  ctx.fillStyle = color;
  
  for (const kp of face.keypoints) {
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/**
 * Draw face bounding box
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  bbox: BoundingBox,
  color: string = '#00ff00',
  lineWidth: number = 2
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
}
