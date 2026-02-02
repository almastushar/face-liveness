// Main FaceLiveness component - Modern UI

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Camera, RefreshCcw, Bug, Shield, Sparkles } from 'lucide-react';

import { useCamera } from '@/hooks/useCamera';
import { useFaceDetector, Face } from '@/hooks/useFaceDetector';
import { useRafThrottleLoop } from '@/hooks/useRafThrottleLoop';
import { useLivenessStateMachine } from '@/hooks/useLivenessStateMachine';

import { CameraView } from './CameraView';
import { StepIndicator } from './StepIndicator';
import { ActionPrompt } from './ActionPrompt';
import { DirectionGuide } from './DirectionGuide';
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
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<number | null>(null);
  
  const camera = useCamera();
  const detector = useFaceDetector();
  const livenessState = useLivenessStateMachine((livenessResult) => {
    setResult(livenessResult);
    onSuccess?.(livenessResult);
  });
  
  const calculateGuideBox = useCallback((): BoundingBox | null => {
    const video = camera.videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    
    const width = video.videoWidth * CONFIG.GUIDE_BOX_WIDTH_RATIO;
    const height = video.videoHeight * CONFIG.GUIDE_BOX_HEIGHT_RATIO;
    const x = (video.videoWidth - width) / 2;
    const y = (video.videoHeight - height) / 2;
    
    return { x, y, width, height };
  }, [camera.videoRef]);
  
  const onFrame = useCallback(async () => {
    const video = camera.videoRef.current;
    if (!video || !detector.isReady || livenessState.state.isComplete) return;
    
    if (!guideBox) {
      const newGuideBox = calculateGuideBox();
      if (newGuideBox) setGuideBox(newGuideBox);
      return;
    }
    
    const faces = await detector.detectFaces(video);
    const face = faces.length > 0 ? faces[0] : null;
    setCurrentFace(face);
    
    livenessState.processFace(face as any, guideBox);
    frameCountRef.current++;
  }, [camera.videoRef, detector, livenessState, guideBox, calculateGuideBox]);
  
  useRafThrottleLoop({
    targetFPS: CONFIG.TARGET_FPS,
    onFrame,
    enabled: isStarted && camera.hasPermission && detector.isReady && !livenessState.state.isComplete,
  });
  
  useEffect(() => {
    if (isStarted && detector.isReady) {
      fpsIntervalRef.current = window.setInterval(() => {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
      }, 1000);
    }
    
    return () => {
      if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    };
  }, [isStarted, detector.isReady]);
  
  const handleStart = async () => {
    setResult(null);
    setLoadingMessage('Starting camera...');
    
    try {
      await camera.startCamera();
      setLoadingMessage('Loading face detection model...');
      await detector.initialize();
      
      setTimeout(() => {
        const newGuideBox = calculateGuideBox();
        setGuideBox(newGuideBox);
        livenessState.start();
        setIsStarted(true);
        setLoadingMessage('');
      }, 500);
    } catch (err) {
      console.error('Failed to start:', err);
      setLoadingMessage('');
    }
  };
  
  const handleRestart = () => {
    setResult(null);
    setCurrentFace(null);
    const newGuideBox = calculateGuideBox();
    setGuideBox(newGuideBox);
    livenessState.restart();
  };
  
  const debugInfo = livenessState.getDebugInfo();
  const insideGuide = currentFace && guideBox 
    ? isFaceInsideGuide(calculateBoundingBox(currentFace as any), guideBox, CONFIG.INSIDE_GUIDE_MARGIN)
    : false;
  
  // Calculate direction progress for visual feedback
  const getDirectionProgress = () => {
    const step = livenessState.state.currentStep;
    if (!['TURN_LEFT', 'TURN_RIGHT', 'TURN_UP', 'TURN_DOWN'].includes(step)) return 0;
    
    const heldFrames = debugInfo.heldFrames;
    return Math.min((heldFrames / CONFIG.POSE_HELD_FRAMES) * 100, 100);
  };
  
  // Show success screen
  if (livenessState.state.isComplete && result) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <SuccessScreen result={result} onRestart={handleRestart} />
      </div>
    );
  }
  
  // Loading state
  if (loadingMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground text-center mt-6 text-lg">{loadingMessage}</p>
        <p className="text-muted-foreground/60 text-sm mt-2">This may take a moment...</p>
      </div>
    );
  }
  
  // Error state
  if (detector.error || camera.error) {
    const errorMessage = detector.error || camera.error;
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h3>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>
          <Button onClick={detector.error ? () => window.location.reload() : handleStart} size="lg">
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  // Welcome screen
  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <div className="w-full max-w-lg text-center space-y-8">
          {/* Hero icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-primary animate-pulse" />
          </div>
          
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-3">Face Verification</h1>
            <p className="text-muted-foreground text-lg">
              Quick identity check using your camera
            </p>
          </div>
          
          {/* Steps preview */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { icon: '👤', text: 'Align your face' },
              { icon: '👁️', text: 'Blink naturally' },
              { icon: '↔️', text: 'Turn left & right' },
              { icon: '↕️', text: 'Look up & down' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
          
          {/* CTA */}
          <Button 
            onClick={handleStart} 
            size="lg" 
            className="w-full h-14 text-lg font-semibold rounded-xl"
            disabled={camera.isLoading || detector.isLoading}
          >
            {camera.isLoading || detector.isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Start Verification
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground/70">
            Research demonstration • Not a certified PAD solution
          </p>
        </div>
      </div>
    );
  }
  
  // Active verification
  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Progress indicator */}
      <StepIndicator 
        currentStep={livenessState.state.currentStep}
        completedSteps={livenessState.state.completedSteps}
      />
      
      {/* Camera view with overlays */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl bg-muted">
        <CameraView
          videoRef={camera.videoRef}
          isActive={isStarted}
          face={currentFace as any}
          guideBox={guideBox}
          showLandmarks={showLandmarks}
          stream={camera.stream}
        />
        
        {/* Direction arrows */}
        <DirectionGuide 
          currentStep={livenessState.state.currentStep}
          progress={getDirectionProgress()}
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
          depthVariance={debugInfo.depthVariance}
          microMovement={debugInfo.microMovement}
          spoofScore={debugInfo.spoofScore}
          isSpoof={debugInfo.isSpoof}
        />
      </div>
      
      {/* Action prompt */}
      <ActionPrompt
        currentStep={livenessState.state.currentStep}
        error={livenessState.state.error}
        isCalibrating={livenessState.state.blinkState.isCalibrating}
      />
      
      {/* Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestart}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Start Over
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="debug"
              checked={showDebug}
              onCheckedChange={setShowDebug}
            />
            <Label htmlFor="debug" className="text-sm text-muted-foreground cursor-pointer">
              <Bug className="h-4 w-4" />
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="landmarks"
              checked={showLandmarks}
              onCheckedChange={setShowLandmarks}
            />
            <Label htmlFor="landmarks" className="text-sm text-muted-foreground cursor-pointer">
              Dots
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
