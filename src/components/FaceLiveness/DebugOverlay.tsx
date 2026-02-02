// Debug overlay component for development

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DebugOverlayProps {
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
}

export function DebugOverlay({
  isVisible,
  fps,
  faceDetected,
  insideGuide,
  currentEAR,
  openEARBaseline,
  blinkThreshold,
  eyeState,
  yawDelta,
  pitchDelta,
  rollMetric,
  alignedFrames,
  heldFrames,
}: DebugOverlayProps) {
  if (!isVisible) return null;
  
  return (
    <Card className="absolute top-4 left-4 w-64 bg-background/90 backdrop-blur-sm border-muted text-xs z-10">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm">Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3 space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">FPS:</span>
          <span className="font-mono">{fps.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Face:</span>
          <span className={faceDetected ? 'text-green-500' : 'text-destructive'}>
            {faceDetected ? 'Detected' : 'Not Found'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">In Guide:</span>
          <span className={insideGuide ? 'text-green-500' : 'text-yellow-500'}>
            {insideGuide ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="border-t border-muted my-1 pt-1">
          <p className="text-muted-foreground mb-1">Blink Detection:</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current EAR:</span>
            <span className="font-mono">{currentEAR.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Open EAR:</span>
            <span className="font-mono">{openEARBaseline.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Threshold:</span>
            <span className="font-mono">{blinkThreshold.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Eye State:</span>
            <span className={eyeState === 'CLOSED' ? 'text-yellow-500' : 'text-green-500'}>
              {eyeState}
            </span>
          </div>
        </div>
        
        <div className="border-t border-muted my-1 pt-1">
          <p className="text-muted-foreground mb-1">Head Pose:</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Yaw Δ:</span>
            <span className="font-mono">{yawDelta.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pitch Δ:</span>
            <span className="font-mono">{pitchDelta.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Roll:</span>
            <span className="font-mono">{rollMetric.toFixed(3)}</span>
          </div>
        </div>
        
        <div className="border-t border-muted my-1 pt-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aligned:</span>
            <span className="font-mono">{alignedFrames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Held:</span>
            <span className="font-mono">{heldFrames}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
