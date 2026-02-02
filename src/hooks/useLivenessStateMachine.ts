// Liveness verification state machine hook

import { useRef, useCallback, useState } from 'react';
import type { Face } from '@tensorflow-models/face-landmarks-detection';
import { 
  LivenessStep, 
  LivenessState, 
  BlinkState, 
  HeadPoseState,
  BaselineMetrics,
  STEP_ORDER,
  generateRandomStepOrder,
  CONFIG,
  LivenessResult,
  FaceMetrics,
  BoundingBox,
} from '@/types/liveness';
import { calculateAverageEAR, getEyeState } from '@/utils/ear';
import { calculatePoseMetrics, getYawDelta, getPitchDelta, isRollAcceptable } from '@/utils/pose';
import { calculateBoundingBox, isFaceInsideGuide } from '@/utils/landmarks';
import { ema, sma } from '@/utils/smoothing';
import { 
  AntiSpoofState, 
  createAntiSpoofState, 
  updateAntiSpoofState, 
  getAntiSpoofDebugInfo 
} from '@/utils/antiSpoof';
import { playSuccessSound, playCompletionSound } from '@/utils/audio';

const initialBlinkState: BlinkState = {
  isCalibrating: true,
  calibrationFrames: 0,
  earSamples: [],
  openEARBaseline: 0,
  closedThreshold: 0,
  eyeState: 'UNKNOWN',
  closedFrameCount: 0,
  openFrameCount: 0,
  blinkDetected: false,
  lastBlinkTime: 0,
};

const initialHeadPoseState: HeadPoseState = {
  heldFrames: 0,
  targetReached: false,
};

const initialState: LivenessState = {
  currentStep: 'IDLE',
  stepOrder: STEP_ORDER, // Will be randomized on start
  stepEnteredAt: 0,
  stepCompletedAt: null,
  alignedFrameCount: 0,
  baselineMetrics: null,
  blinkState: initialBlinkState,
  headPoseState: initialHeadPoseState,
  yawDeltas: [],
  pitchDeltas: [],
  completedSteps: [],
  isComplete: false,
  error: null,
};

export interface LivenessStateMachineControls {
  state: LivenessState;
  start: () => void;
  restart: () => void;
  processFace: (face: Face | null, guideBox: BoundingBox) => void;
  getCurrentStepNumber: () => number;
  getDebugInfo: () => {
    currentEAR: number;
    openEARBaseline: number;
    blinkThreshold: number;
    eyeState: string;
    yawDelta: number;
    pitchDelta: number;
    rollMetric: number;
    alignedFrames: number;
    heldFrames: number;
    // Anti-spoof metrics
    depthVariance: number;
    microMovement: number;
    spoofScore: number;
    isSpoof: boolean;
  };
}

export function useLivenessStateMachine(
  onSuccess?: (result: LivenessResult) => void
): LivenessStateMachineControls {
  const [state, setState] = useState<LivenessState>(initialState);
  
  // Refs for mutable state that doesn't need re-renders
  const stateRef = useRef<LivenessState>(initialState);
  const smoothedEARRef = useRef<number>(0);
  const currentMetricsRef = useRef<FaceMetrics | null>(null);
  const antiSpoofRef = useRef<AntiSpoofState>(createAntiSpoofState());
  
  // Sync ref with state
  const updateState = useCallback((updater: (prev: LivenessState) => LivenessState) => {
    setState(prev => {
      const newState = updater(prev);
      stateRef.current = newState;
      return newState;
    });
  }, []);
  
  // Enter a new step
  const enterStep = useCallback((step: LivenessStep) => {
    const now = Date.now();
    
    updateState(prev => ({
      ...prev,
      currentStep: step,
      stepEnteredAt: now,
      stepCompletedAt: null,
      alignedFrameCount: 0,
      headPoseState: initialHeadPoseState,
      // Reset blink state only when entering BLINK step
      blinkState: step === 'BLINK' 
        ? { ...initialBlinkState }
        : prev.blinkState,
    }));
  }, [updateState]);
  
  // Complete current step and advance
  const completeStep = useCallback((step: LivenessStep) => {
    const now = Date.now();
    const current = stateRef.current;
    const stepOrder = current.stepOrder;
    const currentIndex = stepOrder.indexOf(step);
    const isLastStep = currentIndex === stepOrder.length - 1;
    
    updateState(prev => {
      const newCompletedSteps = [...prev.completedSteps, step];
      
      // Record metrics for head pose steps
      let newYawDeltas = prev.yawDeltas;
      let newPitchDeltas = prev.pitchDeltas;
      
      if (currentMetricsRef.current && prev.baselineMetrics) {
        const yawDelta = getYawDelta(
          currentMetricsRef.current.yawMetric,
          prev.baselineMetrics.yawMetric
        );
        const pitchDelta = getPitchDelta(
          currentMetricsRef.current.pitchMetric,
          prev.baselineMetrics.pitchMetric
        );
        
        if (step === 'TURN_LEFT' || step === 'TURN_RIGHT') {
          newYawDeltas = [...prev.yawDeltas, yawDelta];
        }
        if (step === 'TURN_UP' || step === 'TURN_DOWN') {
          newPitchDeltas = [...prev.pitchDeltas, pitchDelta];
        }
      }
      
      if (isLastStep) {
        // Verification complete
        const result: LivenessResult = {
          timestamp: new Date(),
          stepsCompleted: newCompletedSteps,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
          metricsSummary: {
            openEAR: prev.blinkState.openEARBaseline,
            blinkThreshold: prev.blinkState.closedThreshold,
            yawDeltas: newYawDeltas,
            pitchDeltas: newPitchDeltas,
          },
        };
        
        // Play completion fanfare
        playCompletionSound();
        
        // Call success callback
        setTimeout(() => onSuccess?.(result), 0);
        
        return {
          ...prev,
          currentStep: 'SUCCESS' as LivenessStep,
          stepCompletedAt: now,
          completedSteps: newCompletedSteps,
          yawDeltas: newYawDeltas,
          pitchDeltas: newPitchDeltas,
          isComplete: true,
        };
      }
      
      return {
        ...prev,
        stepCompletedAt: now,
        completedSteps: newCompletedSteps,
        yawDeltas: newYawDeltas,
        pitchDeltas: newPitchDeltas,
      };
    });
    
    // Play step completion sound and advance to next step
    if (!isLastStep) {
      playSuccessSound();
      const nextStep = stepOrder[currentIndex + 1];
      setTimeout(() => {
        enterStep(nextStep);
      }, CONFIG.STEP_COOLDOWN_MS);
    }
  }, [enterStep, updateState, onSuccess]);
  
  // Process ALIGN step
  const processAlign = useCallback((face: Face, insideGuide: boolean) => {
    const current = stateRef.current;
    
    if (!insideGuide) {
      updateState(prev => ({
        ...prev,
        alignedFrameCount: 0,
      }));
      return;
    }
    
    const newAlignedCount = current.alignedFrameCount + 1;
    
    if (newAlignedCount >= CONFIG.ALIGN_REQUIRED_FRAMES) {
      // Capture baseline metrics
      const earData = calculateAverageEAR(face);
      const poseMetrics = calculatePoseMetrics(face);
      const bbox = calculateBoundingBox(face);
      
      const baseline: BaselineMetrics = {
        yawMetric: poseMetrics.yawMetric,
        pitchMetric: poseMetrics.pitchMetric,
        rollMetric: poseMetrics.rollMetric,
        faceWidth: bbox.width,
        faceHeight: bbox.height,
        openEAR: earData.avg,
      };
      
      updateState(prev => ({
        ...prev,
        alignedFrameCount: newAlignedCount,
        baselineMetrics: baseline,
      }));
      
      completeStep('ALIGN');
    } else {
      updateState(prev => ({
        ...prev,
        alignedFrameCount: newAlignedCount,
      }));
    }
  }, [updateState, completeStep]);
  
  // Process BLINK step
  const processBlink = useCallback((face: Face) => {
    const current = stateRef.current;
    const now = Date.now();
    
    // Get current EAR
    const earData = calculateAverageEAR(face);
    const currentEAR = earData.avg;
    
    // Apply EMA smoothing
    smoothedEARRef.current = ema(currentEAR, smoothedEARRef.current, CONFIG.EMA_ALPHA);
    const smoothedEAR = smoothedEARRef.current;
    
    let newBlinkState = { ...current.blinkState };
    
    // Calibration phase
    if (newBlinkState.isCalibrating) {
      newBlinkState.earSamples.push(smoothedEAR);
      newBlinkState.calibrationFrames++;
      
      if (newBlinkState.calibrationFrames >= CONFIG.BLINK_CALIBRATION_FRAMES) {
        // Calculate baseline from samples
        const avgEAR = sma(newBlinkState.earSamples);
        newBlinkState.openEARBaseline = avgEAR;
        newBlinkState.closedThreshold = avgEAR * CONFIG.CLOSED_THRESHOLD_RATIO;
        newBlinkState.isCalibrating = false;
        newBlinkState.eyeState = 'OPEN';
      }
      
      updateState(prev => ({
        ...prev,
        blinkState: newBlinkState,
      }));
      return;
    }
    
    // Check if in cooldown
    if (now - newBlinkState.lastBlinkTime < CONFIG.BLINK_COOLDOWN_MS) {
      return;
    }
    
    // Detect eye state
    const eyeState = getEyeState(
      smoothedEAR,
      newBlinkState.openEARBaseline,
      CONFIG.CLOSED_THRESHOLD_RATIO
    );
    
    // State machine for blink detection
    if (eyeState === 'CLOSED') {
      newBlinkState.closedFrameCount++;
      newBlinkState.openFrameCount = 0;
      newBlinkState.eyeState = 'CLOSED';
    } else if (eyeState === 'OPEN') {
      // Check if we had enough closed frames
      if (newBlinkState.closedFrameCount >= CONFIG.CLOSED_FRAME_THRESHOLD) {
        newBlinkState.openFrameCount++;
        
        if (newBlinkState.openFrameCount >= CONFIG.OPEN_FRAME_THRESHOLD) {
          // Blink detected!
          newBlinkState.blinkDetected = true;
          newBlinkState.lastBlinkTime = now;
          
          updateState(prev => ({
            ...prev,
            blinkState: newBlinkState,
          }));
          
          completeStep('BLINK');
          return;
        }
      } else {
        newBlinkState.closedFrameCount = 0;
      }
      newBlinkState.eyeState = 'OPEN';
    }
    
    updateState(prev => ({
      ...prev,
      blinkState: newBlinkState,
    }));
  }, [updateState, completeStep]);
  
  // Process head turn steps
  const processHeadTurn = useCallback((
    face: Face,
    step: 'TURN_LEFT' | 'TURN_RIGHT' | 'TURN_UP' | 'TURN_DOWN'
  ) => {
    const current = stateRef.current;
    
    if (!current.baselineMetrics) return;
    
    const poseMetrics = calculatePoseMetrics(face);
    const earDataTurn = calculateAverageEAR(face);
    currentMetricsRef.current = {
      boundingBox: calculateBoundingBox(face),
      yawMetric: poseMetrics.yawMetric,
      pitchMetric: poseMetrics.pitchMetric,
      rollMetric: poseMetrics.rollMetric,
      faceWidth: poseMetrics.faceWidth,
      faceHeight: poseMetrics.faceHeight,
      leftEAR: earDataTurn.left,
      rightEAR: earDataTurn.right,
      avgEAR: earDataTurn.avg,
    };
    
    // Check roll - warn if too tilted
    if (!isRollAcceptable(poseMetrics.rollMetric, CONFIG.ROLL_WARNING_THRESHOLD)) {
      updateState(prev => ({
        ...prev,
        error: 'Keep your head straight (not tilted)',
        headPoseState: initialHeadPoseState,
      }));
      return;
    } else {
      updateState(prev => ({
        ...prev,
        error: null,
      }));
    }
    
    const yawDelta = getYawDelta(poseMetrics.yawMetric, current.baselineMetrics.yawMetric);
    const pitchDelta = getPitchDelta(poseMetrics.pitchMetric, current.baselineMetrics.pitchMetric);
    
    let targetReached = false;
    
    switch (step) {
      case 'TURN_LEFT':
        targetReached = yawDelta <= -CONFIG.YAW_THRESHOLD;
        break;
      case 'TURN_RIGHT':
        targetReached = yawDelta >= CONFIG.YAW_THRESHOLD;
        break;
      case 'TURN_UP':
        targetReached = pitchDelta <= -CONFIG.PITCH_THRESHOLD;
        break;
      case 'TURN_DOWN':
        targetReached = pitchDelta >= CONFIG.PITCH_THRESHOLD;
        break;
    }
    
    if (targetReached) {
      const newHeldFrames = current.headPoseState.heldFrames + 1;
      
      if (newHeldFrames >= CONFIG.POSE_HELD_FRAMES) {
        completeStep(step);
      } else {
        updateState(prev => ({
          ...prev,
          headPoseState: {
            heldFrames: newHeldFrames,
            targetReached: true,
          },
        }));
      }
    } else {
      updateState(prev => ({
        ...prev,
        headPoseState: initialHeadPoseState,
      }));
    }
  }, [updateState, completeStep]);
  
  // Main face processing
  const processFace = useCallback((face: Face | null, guideBox: BoundingBox) => {
    const current = stateRef.current;
    
    if (current.isComplete || current.currentStep === 'IDLE' || current.currentStep === 'SUCCESS') {
      return;
    }
    
    if (!face) {
      updateState(prev => ({
        ...prev,
        error: 'No face detected. Move into the frame.',
        alignedFrameCount: 0,
        headPoseState: initialHeadPoseState,
      }));
      return;
    }
    
    const faceBbox = calculateBoundingBox(face);
    const insideGuide = isFaceInsideGuide(faceBbox, guideBox, CONFIG.INSIDE_GUIDE_MARGIN);
    
    // Check face size
    const faceRatio = faceBbox.width / guideBox.width;
    if (faceRatio < CONFIG.MIN_FACE_RATIO) {
      updateState(prev => ({
        ...prev,
        error: 'Move closer to the camera',
      }));
      return;
    }
    if (faceRatio > CONFIG.MAX_FACE_RATIO) {
      updateState(prev => ({
        ...prev,
        error: 'Move further from the camera',
      }));
      return;
    }
    
    // Update anti-spoof detection
    antiSpoofRef.current = updateAntiSpoofState(antiSpoofRef.current, face);
    
    // Check for spoof attempt
    if (antiSpoofRef.current.isSpoof) {
      updateState(prev => ({
        ...prev,
        error: antiSpoofRef.current.reason || 'Photo or screen detected. Use a real face.',
        alignedFrameCount: 0,
        headPoseState: initialHeadPoseState,
      }));
      return;
    }
    
    // Store current metrics
    const poseMetrics = calculatePoseMetrics(face);
    const earData = calculateAverageEAR(face);
    currentMetricsRef.current = {
      boundingBox: faceBbox,
      yawMetric: poseMetrics.yawMetric,
      pitchMetric: poseMetrics.pitchMetric,
      rollMetric: poseMetrics.rollMetric,
      faceWidth: poseMetrics.faceWidth,
      faceHeight: poseMetrics.faceHeight,
      leftEAR: earData.left,
      rightEAR: earData.right,
      avgEAR: earData.avg,
    };
    
    // Clear general errors if face is valid
    if (insideGuide && current.currentStep !== 'ALIGN') {
      updateState(prev => ({
        ...prev,
        error: null,
      }));
    }
    
    // Process based on current step
    switch (current.currentStep) {
      case 'ALIGN':
        if (!insideGuide) {
          updateState(prev => ({
            ...prev,
            error: 'Move your face inside the box',
            alignedFrameCount: 0,
          }));
        } else {
          updateState(prev => ({ ...prev, error: null }));
          processAlign(face, insideGuide);
        }
        break;
        
      case 'BLINK':
        processBlink(face);
        break;
        
      case 'TURN_LEFT':
      case 'TURN_RIGHT':
      case 'TURN_UP':
      case 'TURN_DOWN':
        processHeadTurn(face, current.currentStep);
        break;
    }
  }, [updateState, processAlign, processBlink, processHeadTurn]);
  
  // Start verification with randomized step order
  const start = useCallback(() => {
    smoothedEARRef.current = 0;
    currentMetricsRef.current = null;
    antiSpoofRef.current = createAntiSpoofState();
    
    const randomizedOrder = generateRandomStepOrder();
    
    updateState(() => ({
      ...initialState,
      stepOrder: randomizedOrder,
      currentStep: 'ALIGN',
      stepEnteredAt: Date.now(),
    }));
  }, [updateState]);
  
  // Restart verification
  const restart = useCallback(() => {
    smoothedEARRef.current = 0;
    currentMetricsRef.current = null;
    antiSpoofRef.current = createAntiSpoofState();
    
    updateState(() => initialState);
    
    // Small delay before starting
    setTimeout(start, 100);
  }, [updateState, start]);
  
  // Get current step number
  const getCurrentStepNumber = useCallback(() => {
    const current = stateRef.current;
    if (current.currentStep === 'IDLE') return 0;
    if (current.currentStep === 'SUCCESS') return current.stepOrder.length;
    
    const index = current.stepOrder.indexOf(current.currentStep);
    return index >= 0 ? index + 1 : 0;
  }, []);
  
  // Get debug info
  const getDebugInfo = useCallback(() => {
    const current = stateRef.current;
    const metrics = currentMetricsRef.current;
    const antiSpoofDebug = getAntiSpoofDebugInfo(antiSpoofRef.current);
    
    const yawDelta = metrics && current.baselineMetrics
      ? getYawDelta(metrics.yawMetric, current.baselineMetrics.yawMetric)
      : 0;
    const pitchDelta = metrics && current.baselineMetrics
      ? getPitchDelta(metrics.pitchMetric, current.baselineMetrics.pitchMetric)
      : 0;
    
    return {
      currentEAR: smoothedEARRef.current,
      openEARBaseline: current.blinkState.openEARBaseline,
      blinkThreshold: current.blinkState.closedThreshold,
      eyeState: current.blinkState.eyeState,
      yawDelta,
      pitchDelta,
      rollMetric: metrics?.rollMetric || 0,
      alignedFrames: current.alignedFrameCount,
      heldFrames: current.headPoseState.heldFrames,
      // Anti-spoof metrics
      depthVariance: antiSpoofDebug.avgDepthVariance,
      microMovement: antiSpoofDebug.avgMovement,
      spoofScore: antiSpoofDebug.spoofScore,
      isSpoof: antiSpoofDebug.isSpoof,
    };
  }, []);
  
  return {
    state,
    start,
    restart,
    processFace,
    getCurrentStepNumber,
    getDebugInfo,
  };
}
