// Liveness verification types

export type LivenessStep = 
  | 'IDLE'
  | 'ALIGN'
  | 'BLINK'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'TURN_UP'
  | 'TURN_DOWN'
  | 'SUCCESS';

export const STEP_ORDER: LivenessStep[] = [
  'ALIGN',
  'BLINK',
  'TURN_LEFT',
  'TURN_RIGHT',
  'TURN_UP',
  'TURN_DOWN',
];

export interface StepInstruction {
  step: LivenessStep;
  instruction: string;
  stepNumber: number;
}

export const STEP_INSTRUCTIONS: Record<LivenessStep, string> = {
  IDLE: 'Preparing...',
  ALIGN: 'Align your face inside the box',
  BLINK: 'Please blink your eyes',
  TURN_LEFT: 'Turn your head left',
  TURN_RIGHT: 'Turn your head right',
  TURN_UP: 'Tilt your head up',
  TURN_DOWN: 'Tilt your head down',
  SUCCESS: 'User face verified successfully',
};

export interface FaceMetrics {
  boundingBox: BoundingBox;
  yawMetric: number;
  pitchMetric: number;
  rollMetric: number;
  faceWidth: number;
  faceHeight: number;
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaselineMetrics {
  yawMetric: number;
  pitchMetric: number;
  rollMetric: number;
  faceWidth: number;
  faceHeight: number;
  openEAR: number;
}

export interface BlinkState {
  isCalibrating: boolean;
  calibrationFrames: number;
  earSamples: number[];
  openEARBaseline: number;
  closedThreshold: number;
  eyeState: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  closedFrameCount: number;
  openFrameCount: number;
  blinkDetected: boolean;
  lastBlinkTime: number;
}

export interface HeadPoseState {
  heldFrames: number;
  targetReached: boolean;
}

export interface LivenessState {
  currentStep: LivenessStep;
  stepEnteredAt: number;
  stepCompletedAt: number | null;
  alignedFrameCount: number;
  baselineMetrics: BaselineMetrics | null;
  blinkState: BlinkState;
  headPoseState: HeadPoseState;
  yawDeltas: number[];
  pitchDeltas: number[];
  completedSteps: LivenessStep[];
  isComplete: boolean;
  error: string | null;
}

export interface LivenessResult {
  timestamp: Date;
  stepsCompleted: LivenessStep[];
  deviceInfo: {
    userAgent: string;
    platform: string;
  };
  metricsSummary: {
    openEAR: number;
    blinkThreshold: number;
    yawDeltas: number[];
    pitchDeltas: number[];
  };
}

export interface DebugInfo {
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
}

// Configuration constants
export const CONFIG = {
  // Camera
  IDEAL_WIDTH: 640,
  IDEAL_HEIGHT: 480,
  
  // Detection loop
  TARGET_FPS: 12,
  FRAME_INTERVAL: 1000 / 12, // ~83ms
  
  // Guide box (percentage of video dimensions)
  GUIDE_BOX_WIDTH_RATIO: 0.6,
  GUIDE_BOX_HEIGHT_RATIO: 0.7,
  
  // Alignment
  ALIGN_REQUIRED_FRAMES: 12, // ~1 second at 12 FPS
  INSIDE_GUIDE_MARGIN: 0.05, // 5% margin
  
  // Blink detection
  BLINK_CALIBRATION_FRAMES: 15,
  CLOSED_THRESHOLD_RATIO: 0.65,
  CLOSED_FRAME_THRESHOLD: 2,
  OPEN_FRAME_THRESHOLD: 2,
  BLINK_COOLDOWN_MS: 600,
  
  // EMA smoothing
  EMA_ALPHA: 0.3,
  
  // Head pose thresholds (normalized)
  YAW_THRESHOLD: 0.09,
  PITCH_THRESHOLD: 0.07,
  ROLL_WARNING_THRESHOLD: 0.15,
  POSE_HELD_FRAMES: 4,
  
  // Step transitions
  STEP_COOLDOWN_MS: 500,
  
  // Face size bounds (ratio to guide box)
  MIN_FACE_RATIO: 0.3,
  MAX_FACE_RATIO: 0.95,
} as const;
