// FaceLiveness component types

import type { Face } from '@/hooks/useFaceDetector';
import type { BoundingBox, LivenessResult, LivenessStep } from '@/types/liveness';

export interface FaceLivenessProps {
  onSuccess?: (result: LivenessResult) => void;
}

export interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  face: Face | null;
  guideBox: BoundingBox | null;
  showLandmarks: boolean;
  stream: MediaStream | null;
}

export interface StepIndicatorProps {
  currentStep: LivenessStep;
  completedSteps: LivenessStep[];
  stepOrder: LivenessStep[];
}

export interface ActionPromptProps {
  currentStep: LivenessStep;
  error: string | null;
  isCalibrating: boolean;
}

export interface DirectionGuideProps {
  currentStep: LivenessStep;
  progress: number;
}

export interface DebugOverlayProps {
  isVisible: boolean;
  fps: number;
  faceDetected: boolean;
  insideGuide: boolean;
  currentEAR: number;
  openEARBaseline: number;
  blinkThreshold: number;
  eyeState: string;
  yawDelta: number;
  pitchDelta: number;
  rollMetric: number;
  alignedFrames: number;
  heldFrames: number;
  depthVariance: number;
  microMovement: number;
  spoofScore: number;
  isSpoof: boolean;
}

export interface SuccessScreenProps {
  result: LivenessResult;
  onRestart: () => void;
}
