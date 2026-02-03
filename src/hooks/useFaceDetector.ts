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

// Lazy loaded modules
let tf: typeof import('@tensorflow/tfjs') | null = null;
let faceLandmarksDetection: typeof import('@tensorflow-models/face-landmarks-detection') | null = null;

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
      // Load TensorFlow.js if not already loaded
      if (!tf) {
        tf = await import('@tensorflow/tfjs');
      }
      
      if (!faceLandmarksDetection) {
        faceLandmarksDetection = await import('@tensorflow-models/face-landmarks-detection');
      }
      
      // Set backend - use WebGL for better performance
      await tf.setBackend('webgl');
      await tf.ready();
      
      console.log('TensorFlow.js backend ready:', tf.getBackend());
      
      // Create detector with MediaPipe FaceMesh model
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      
      // Use mediapipe runtime with CDN path (script loaded in index.html)
      const detectorConfig = {
        runtime: 'mediapipe' as const,
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619',
        refineLandmarks: true,
        maxFaces: 1,
      };
      
      console.log('Creating face detector with config:', detectorConfig);
      
      const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
      
      console.log('Face detector created successfully');
      
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
    
    // Check video readiness
    if (video.readyState < 2) {
      return [];
    }
    
    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
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
