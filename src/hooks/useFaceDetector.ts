// Face detector hook for TensorFlow.js face-landmarks-detection

import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import type { Face, FaceLandmarksDetector } from '@tensorflow-models/face-landmarks-detection';

export interface FaceDetectorState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

export interface FaceDetectorControls {
  detectFaces: (video: HTMLVideoElement) => Promise<Face[]>;
  dispose: () => void;
}

export function useFaceDetector(): FaceDetectorState & FaceDetectorControls {
  const [state, setState] = useState<FaceDetectorState>({
    isLoading: true,
    isReady: false,
    error: null,
  });
  
  const detectorRef = useRef<FaceLandmarksDetector | null>(null);
  const initializingRef = useRef(false);
  
  // Initialize detector
  useEffect(() => {
    const initDetector = async () => {
      if (initializingRef.current || detectorRef.current) return;
      initializingRef.current = true;
      
      try {
        // Set backend
        await tf.setBackend('webgl');
        await tf.ready();
        
        // Create detector with MediaPipe FaceMesh model
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        
        const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
          runtime: 'mediapipe',
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
        
        setState({
          isLoading: false,
          isReady: false,
          error: errorMessage,
        });
      }
    };
    
    initDetector();
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
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);
  
  return {
    ...state,
    detectFaces,
    dispose,
  };
}
