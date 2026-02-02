// Camera view component with video and canvas overlay

import React, { useRef, useEffect, useCallback } from 'react';
import type { Face } from '@tensorflow-models/face-landmarks-detection';
import { CONFIG, BoundingBox } from '@/types/liveness';
import { drawLandmarks, drawBoundingBox, calculateBoundingBox } from '@/utils/landmarks';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  face: Face | null;
  guideBox: BoundingBox | null;
  showLandmarks?: boolean;
}

export function CameraView({
  videoRef,
  isActive,
  face,
  guideBox,
  showLandmarks = false,
}: CameraViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensionsSetRef = useRef(false);
  
  // Set canvas dimensions once when video metadata loads
  const setupCanvas = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || dimensionsSetRef.current) return;
    
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      dimensionsSetRef.current = true;
    }
  }, [videoRef]);
  
  // Listen for video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      setupCanvas();
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Also try to set up immediately if video is already loaded
    if (video.readyState >= 1) {
      setupCanvas();
    }
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, setupCanvas]);
  
  // Draw overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!isActive) return;
    
    // Draw guide box
    if (guideBox) {
      ctx.strokeStyle = face ? 'hsl(142, 76%, 45%)' : 'hsl(var(--primary))';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(guideBox.x, guideBox.y, guideBox.width, guideBox.height);
      ctx.setLineDash([]);
      
      // Draw corner accents
      const cornerLength = 20;
      ctx.lineWidth = 4;
      ctx.strokeStyle = face ? 'hsl(142, 76%, 45%)' : 'hsl(var(--primary))';
      
      // Top-left
      ctx.beginPath();
      ctx.moveTo(guideBox.x, guideBox.y + cornerLength);
      ctx.lineTo(guideBox.x, guideBox.y);
      ctx.lineTo(guideBox.x + cornerLength, guideBox.y);
      ctx.stroke();
      
      // Top-right
      ctx.beginPath();
      ctx.moveTo(guideBox.x + guideBox.width - cornerLength, guideBox.y);
      ctx.lineTo(guideBox.x + guideBox.width, guideBox.y);
      ctx.lineTo(guideBox.x + guideBox.width, guideBox.y + cornerLength);
      ctx.stroke();
      
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(guideBox.x, guideBox.y + guideBox.height - cornerLength);
      ctx.lineTo(guideBox.x, guideBox.y + guideBox.height);
      ctx.lineTo(guideBox.x + cornerLength, guideBox.y + guideBox.height);
      ctx.stroke();
      
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(guideBox.x + guideBox.width - cornerLength, guideBox.y + guideBox.height);
      ctx.lineTo(guideBox.x + guideBox.width, guideBox.y + guideBox.height);
      ctx.lineTo(guideBox.x + guideBox.width, guideBox.y + guideBox.height - cornerLength);
      ctx.stroke();
    }
    
    // Draw face landmarks and bounding box
    if (face && showLandmarks) {
      drawLandmarks(ctx, face, 'rgba(0, 255, 0, 0.5)', 1);
      
      const faceBbox = calculateBoundingBox(face);
      drawBoundingBox(ctx, faceBbox, 'hsl(142, 76%, 45%)', 2);
    }
  }, [isActive, face, guideBox, showLandmarks]);
  
  // Reset dimensions flag when component unmounts
  useEffect(() => {
    return () => {
      dimensionsSetRef.current = false;
    };
  }, []);
  
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[4/3] bg-muted rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover mirror"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
}
