

# Face Liveness Verification Web App

A browser-based face liveness verification system using TensorFlow.js and MediaPipe FaceMesh for real-time face detection and liveness checks.

## Overview

This research-grade liveness verification app will run entirely in the browser with no server-side processing required. It implements a 6-step challenge-response system to verify that a real person is present.

---

## Core Features

### 1. Camera & Video System
- Responsive camera view that works on desktop and mobile browsers
- Support for iOS Safari with proper video attributes (playsInline, muted, autoplay)
- Graceful permission handling with clear error messages
- Automatic cleanup on unmount

### 2. Face Detection Engine
- TensorFlow.js with MediaPipe FaceMesh runtime
- 468 facial landmark detection
- Throttled inference at 10-15 FPS for performance
- Non-overlapping detection calls

### 3. Liveness Verification Flow (6 Sequential Steps)

| Step | Challenge | Detection Method |
|------|-----------|------------------|
| 1 | ALIGN | Face inside guide box for ~1 second, baseline capture |
| 2 | BLINK | Eye Aspect Ratio (EAR) with calibration |
| 3 | TURN_LEFT | Normalized yaw delta from baseline |
| 4 | TURN_RIGHT | Normalized yaw delta from baseline |
| 5 | TURN_UP | Normalized pitch delta from baseline |
| 6 | TURN_DOWN | Normalized pitch delta from baseline |

### 4. State Machine
- Strict finite state machine with timestamps
- Single-transition-per-step guarantee
- Cooldown logic between steps
- Restart functionality without page reload

### 5. Blink Detection (Calibrated)
- EAR baseline calibration phase
- EMA smoothing for stability
- Closed/Open state detection with frame thresholds
- Cooldown to prevent double-counting

### 6. Head Turn Detection (Normalized)
- Ratio-based yaw/pitch metrics (not raw pixels)
- Baseline comparison from ALIGN step
- Held-pose requirement (3-5 frames)
- Roll detection with warnings

---

## User Interface

### Main Screen
- Live camera feed with canvas overlay
- Centered guide box for face alignment
- Step indicator ("Step X of 6")
- Current instruction text
- Debug toggle for development

### Feedback States
- "No face detected" warning
- "Move face inside box" prompt
- Lighting quality hints
- Permission denied guidance
- Success celebration screen

### Debug Panel (Optional Toggle)
- Current EAR value
- Open EAR baseline
- Threshold values
- Eye state indicator
- Yaw/Pitch deltas

---

## Technical Architecture

### Hooks
- `useCamera()` - Camera stream management
- `useFaceDetector()` - TensorFlow model loading
- `useRafThrottleLoop()` - Throttled animation frame loop
- `useLivenessStateMachine()` - FSM logic

### Utilities
- EAR calculation from landmarks
- EMA smoothing function
- Yaw/Pitch metric computation
- Bounding box calculations
- Face normalization helpers

### Components
- `FaceLiveness` - Main container
- `CameraView` - Video + canvas overlay
- `GuideBox` - Alignment overlay
- `InstructionPanel` - Step text display
- `DebugOverlay` - Developer metrics
- `SuccessScreen` - Completion UI

---

## Success Callback

On completion, the app will call `onSuccess()` with:
```typescript
{
  timestamp: Date,
  stepsCompleted: string[],
  deviceInfo: { userAgent, platform },
  metricsSummary: {
    openEAR: number,
    blinkThreshold: number,
    yawDeltas: number[],
    pitchDeltas: number[]
  }
}
```

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome (Desktop) | ✅ Full |
| Edge | ✅ Full |
| Firefox | ✅ Full |
| Chrome (Android) | ✅ Full |
| Safari (iOS) | ⚠️ Requires HTTPS |

---

## Project Structure

```
src/
├── components/
│   └── FaceLiveness/
│       ├── index.tsx
│       ├── CameraView.tsx
│       ├── GuideBox.tsx
│       ├── InstructionPanel.tsx
│       ├── DebugOverlay.tsx
│       └── SuccessScreen.tsx
├── hooks/
│   ├── useCamera.ts
│   ├── useFaceDetector.ts
│   ├── useRafThrottleLoop.ts
│   └── useLivenessStateMachine.ts
├── utils/
│   ├── landmarks.ts
│   ├── ear.ts
│   ├── pose.ts
│   └── smoothing.ts
├── types/
│   └── liveness.ts
└── pages/
    └── Index.tsx
```

---

## Notes

- **Research Use Only**: This is a heuristic challenge-response system, not a certified PAD (Presentation Attack Detection) solution
- **HTTPS Required**: Mobile browsers require secure context for camera access
- **No External APIs**: All processing happens locally in the browser

