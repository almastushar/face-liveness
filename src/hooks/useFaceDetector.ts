// Face detector hook for TensorFlow.js face-landmarks-detection

import { useState, useRef, useCallback } from 'react';

export interface FaceDetectorState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

export interface Face {
  keypoints: Array<{
    x: number;
    y: number;
    z?: number;
    name?: string;
  }>;
  box?: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
}

export interface FaceDetectorControls {
  initialize: () => Promise<void>;
  detectFaces: (video: HTMLVideoElement) => Promise<Face[]>;
  dispose: () => void;
}

export function useFaceDetector(): FaceDetectorState & FaceDetectorControls {
  const [state, setState] = useState<FaceDetectorState>({
    isLoading: false,
    isReady: false,
    error: null,
  });
  
  const detectorRef = useRef<any>(null);
  const initializingRef = useRef(false);
  
  // Initialize detector - called explicitly
  const initialize = useCallback(async () => {
    if (initializingRef.current || detectorRef.current) return;
    initializingRef.current = true;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Dynamic imports to avoid blocking initial page load
      const tf = await import('@tensorflow/tfjs');
      const faceLandmarksDetection = await import('@tensorflow-models/face-landmarks-detection');
      
      // Set backend
      await tf.setBackend('webgl');
      await tf.ready();
      
      // Create detector with MediaPipe FaceMesh model
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      
      const detectorConfig = {
        runtime: 'mediapipe' as const,
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        refineLandmarks: true,
        maxFaces: 1,
      };
      
      const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
      
      setState({
        isLoading: false,
        isReady: true,
        error: null,
      });
    } catch (err) {
      console.error('Failed to initialize face detector:', err);
      
      let errorMessage = 'Failed to load face detection model';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      initializingRef.current = false;
      setState({
        isLoading: false,
        isReady: false,
        error: errorMessage,
      });
    }
  }, []);
  
  // Detect faces in video
  const detectFaces = useCallback(async (video: HTMLVideoElement): Promise<Face[]> => {
    if (!detectorRef.current) {
      return [];
    }
    
    if (video.readyState < 2) {
      return [];
    }
    
    try {
      const faces = await detectorRef.current.estimateFaces(video, {
        flipHorizontal: false,
      });
      return faces;
    } catch (err) {
      console.error('Face detection error:', err);
      return [];
    }
  }, []);
  
  // Dispose detector
  const dispose = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = null;
    }
    initializingRef.current = false;
  }, []);
  
  return {
    ...state,
    initialize,
    detectFaces,
    dispose,
  };
}
