// Camera hook for managing getUserMedia stream

import { useState, useRef, useCallback, useEffect } from 'react';
import { CONFIG } from '@/types/liveness';

export interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  hasPermission: boolean;
}

export interface CameraControls {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(): CameraState & CameraControls & { videoRef: React.RefObject<HTMLVideoElement> } {
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isLoading: false,
    hasPermission: false,
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setState(prev => ({
      ...prev,
      stream: null,
      hasPermission: false,
    }));
  }, []);
  
  const startCamera = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported. Please use a modern browser with HTTPS.');
      }
      
      // Camera constraints optimized for mobile
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: CONFIG.IDEAL_WIDTH, max: 1280 },
          height: { ideal: CONFIG.IDEAL_HEIGHT, max: 720 },
        },
        audio: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Failed to load video'));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          // Start playing
          video.play().catch(reject);
        });
      }
      
      setState({
        stream,
        error: null,
        isLoading: false,
        hasPermission: true,
      });
    } catch (err) {
      let errorMessage = 'Failed to access camera';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not support required constraints.';
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Camera access requires HTTPS. Please use a secure connection.';
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      
      setState({
        stream: null,
        error: errorMessage,
        isLoading: false,
        hasPermission: false,
      });
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);
  
  return {
    ...state,
    startCamera,
    stopCamera,
    videoRef,
  };
}
