// Main FaceLiveness component

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Face } from '@tensorflow-models/face-landmarks-detection';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Camera, RefreshCcw, Bug } from 'lucide-react';

import { useCamera } from '@/hooks/useCamera';
import { useFaceDetector } from '@/hooks/useFaceDetector';
import { useRafThrottleLoop } from '@/hooks/useRafThrottleLoop';
import { useLivenessStateMachine } from '@/hooks/useLivenessStateMachine';

import { CameraView } from './CameraView';
import { InstructionPanel } from './InstructionPanel';
import { DebugOverlay } from './DebugOverlay';
import { SuccessScreen } from './SuccessScreen';

import { CONFIG, BoundingBox, LivenessResult } from '@/types/liveness';
import { isFaceInsideGuide, calculateBoundingBox } from '@/utils/landmarks';

interface FaceLivenessProps {
  onSuccess?: (result: LivenessResult) => void;
}

export function FaceLiveness({ onSuccess }: FaceLivenessProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [currentFace, setCurrentFace] = useState<Face | null>(null);
  const [guideBox, setGuideBox] = useState<BoundingBox | null>(null);
  const [fps, setFps] = useState(0);
  const [result, setResult] = useState<LivenessResult | null>(null);
  
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<number | null>(null);
  
  // Custom hooks
  const camera = useCamera();
  const detector = useFaceDetector();
  const livenessState = useLivenessStateMachine((livenessResult) => {
    setResult(livenessResult);
    onSuccess?.(livenessResult);
  });
  
  // Calculate guide box based on video dimensions
  const calculateGuideBox = useCallback((): BoundingBox | null => {
    const video = camera.videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    
    const width = video.videoWidth * CONFIG.GUIDE_BOX_WIDTH_RATIO;
    const height = video.videoHeight * CONFIG.GUIDE_BOX_HEIGHT_RATIO;
    const x = (video.videoWidth - width) / 2;
    const y = (video.videoHeight - height) / 2;
    
    return { x, y, width, height };
  }, [camera.videoRef]);
  
  // Detection loop callback
  const onFrame = useCallback(async () => {
    const video = camera.videoRef.current;
    if (!video || !detector.isReady || livenessState.state.isComplete) return;
    
    // Update guide box if not set
    if (!guideBox) {
      const newGuideBox = calculateGuideBox();
      if (newGuideBox) {
        setGuideBox(newGuideBox);
      }
      return;
    }
    
    // Detect faces
    const faces = await detector.detectFaces(video);
    const face = faces.length > 0 ? faces[0] : null;
    setCurrentFace(face);
    
    // Process face in state machine
    livenessState.processFace(face, guideBox);
    
    // FPS counter
    frameCountRef.current++;
  }, [camera.videoRef, detector, livenessState, guideBox, calculateGuideBox]);
  
  // Use RAF throttle loop
  useRafThrottleLoop({
    targetFPS: CONFIG.TARGET_FPS,
    onFrame,
    enabled: isStarted && camera.hasPermission && detector.isReady && !livenessState.state.isComplete,
  });
  
  // FPS calculation
  useEffect(() => {
    if (isStarted) {
      fpsIntervalRef.current = window.setInterval(() => {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
      }, 1000);
    }
    
    return () => {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
    };
  }, [isStarted]);
  
  // Start verification
  const handleStart = async () => {
    setResult(null);
    await camera.startCamera();
    
    // Wait a bit for video to be ready
    setTimeout(() => {
      const newGuideBox = calculateGuideBox();
      setGuideBox(newGuideBox);
      livenessState.start();
      setIsStarted(true);
    }, 500);
  };
  
  // Restart verification
  const handleRestart = () => {
    setResult(null);
    setCurrentFace(null);
    const newGuideBox = calculateGuideBox();
    setGuideBox(newGuideBox);
    livenessState.restart();
  };
  
  // Get debug info
  const debugInfo = livenessState.getDebugInfo();
  const insideGuide = currentFace && guideBox 
    ? isFaceInsideGuide(calculateBoundingBox(currentFace), guideBox, CONFIG.INSIDE_GUIDE_MARGIN)
    : false;
  
  // Show success screen
  if (livenessState.state.isComplete && result) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <SuccessScreen result={result} onRestart={handleRestart} />
      </div>
    );
  }
  
  // Loading state
  if (detector.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading face detection model...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
      </div>
    );
  }
  
  // Error state
  if (detector.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-semibold mb-2">Failed to load face detection</p>
            <p className="text-sm text-muted-foreground">{detector.error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Camera error
  if (camera.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-semibold mb-2">Camera Error</p>
            <p className="text-sm text-muted-foreground">{camera.error}</p>
            <Button onClick={handleStart} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Not started
  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Face Liveness Verification</h2>
              <p className="text-muted-foreground">
                We'll verify you're a real person by asking you to perform a few simple actions.
              </p>
            </div>
            
            <div className="text-left bg-muted rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">You'll be asked to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Align your face in the frame</li>
                <li>Blink your eyes</li>
                <li>Turn your head left and right</li>
                <li>Tilt your head up and down</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleStart} 
              size="lg" 
              className="w-full"
              disabled={camera.isLoading}
            >
              {camera.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Camera...
                </>
              ) : (
                'Start Verification'
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Note: This is a research demonstration and not a certified PAD solution.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Active verification
  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Camera view with overlay */}
      <div className="relative">
        <CameraView
          videoRef={camera.videoRef}
          isActive={isStarted}
          face={currentFace}
          guideBox={guideBox}
          showLandmarks={showLandmarks}
        />
        
        {/* Debug overlay */}
        <DebugOverlay
          isVisible={showDebug}
          fps={fps}
          faceDetected={!!currentFace}
          insideGuide={insideGuide}
          currentEAR={debugInfo.currentEAR}
          openEARBaseline={debugInfo.openEARBaseline}
          blinkThreshold={debugInfo.blinkThreshold}
          eyeState={debugInfo.eyeState}
          yawDelta={debugInfo.yawDelta}
          pitchDelta={debugInfo.pitchDelta}
          rollMetric={debugInfo.rollMetric}
          alignedFrames={debugInfo.alignedFrames}
          heldFrames={debugInfo.heldFrames}
        />
      </div>
      
      {/* Instructions */}
      <InstructionPanel
        currentStep={livenessState.state.currentStep}
        stepNumber={livenessState.getCurrentStepNumber()}
        error={livenessState.state.error}
      />
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestart}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Restart
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="debug"
              checked={showDebug}
              onCheckedChange={setShowDebug}
            />
            <Label htmlFor="debug" className="text-sm">
              <Bug className="h-4 w-4" />
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="landmarks"
              checked={showLandmarks}
              onCheckedChange={setShowLandmarks}
            />
            <Label htmlFor="landmarks" className="text-sm">
              Landmarks
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
