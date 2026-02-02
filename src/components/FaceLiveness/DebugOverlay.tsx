// Debug overlay component for development

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

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
  // Anti-spoof metrics
  depthVariance?: number;
  microMovement?: number;
  spoofScore?: number;
  isSpoof?: boolean;
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
  depthVariance = 0,
  microMovement = 0,
  spoofScore = 0,
  isSpoof = false,
}: DebugOverlayProps) {
  if (!isVisible) return null;
  
  return (
    <Card className="absolute top-2 left-2 sm:top-4 sm:left-4 w-48 sm:w-64 bg-background/90 backdrop-blur-sm border-muted text-[10px] sm:text-xs z-10 max-h-[60%] overflow-y-auto">
      <CardHeader className="py-1.5 px-2 sm:py-2 sm:px-3">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
          Debug
          {isSpoof ? (
            <ShieldAlert className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          ) : (
            <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-1.5 px-2 sm:py-2 sm:px-3 space-y-0.5 sm:space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">FPS:</span>
          <span className="font-mono">{fps.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Face:</span>
          <span className={faceDetected ? 'text-success' : 'text-destructive'}>
            {faceDetected ? 'Detected' : 'Not Found'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">In Guide:</span>
          <span className={insideGuide ? 'text-success' : 'text-warning'}>
            {insideGuide ? 'Yes' : 'No'}
          </span>
        </div>
        
        {/* Anti-Spoof Section */}
        <div className="border-t border-muted my-1 pt-1">
          <p className="text-muted-foreground mb-1 flex items-center gap-1">
            Anti-Spoof:
            <span className={isSpoof ? 'text-destructive font-semibold' : 'text-success'}>
              {isSpoof ? 'BLOCKED' : 'OK'}
            </span>
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Depth Var:</span>
            <span className={`font-mono ${depthVariance < 0.5 ? 'text-destructive' : 'text-success'}`}>
              {depthVariance.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Movement:</span>
            <span className="font-mono">{(microMovement * 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Spoof Score:</span>
            <span className={`font-mono ${spoofScore >= 0.6 ? 'text-destructive' : 'text-success'}`}>
              {(spoofScore * 100).toFixed(0)}%
            </span>
          </div>
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
            <span className={eyeState === 'CLOSED' ? 'text-warning' : 'text-success'}>
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