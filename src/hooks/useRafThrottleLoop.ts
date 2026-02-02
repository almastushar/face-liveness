// Throttled requestAnimationFrame loop hook

import { useRef, useCallback, useEffect } from 'react';

interface UseRafThrottleLoopOptions {
  targetFPS?: number;
  onFrame: (timestamp: number) => void | Promise<void>;
  enabled?: boolean;
}

export function useRafThrottleLoop({
  targetFPS = 12,
  onFrame,
  enabled = true,
}: UseRafThrottleLoopOptions) {
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  
  const frameInterval = 1000 / targetFPS;
  
  const loop = useCallback(async (timestamp: number) => {
    if (!enabled) return;
    
    // Schedule next frame first
    rafRef.current = requestAnimationFrame(loop);
    
    // Check if enough time has passed
    const elapsed = timestamp - lastFrameTimeRef.current;
    if (elapsed < frameInterval) return;
    
    // Prevent overlapping execution
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    
    try {
      await onFrame(timestamp);
      lastFrameTimeRef.current = timestamp;
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, frameInterval, onFrame]);
  
  // Start/stop loop based on enabled state
  useEffect(() => {
    if (enabled) {
      rafRef.current = requestAnimationFrame(loop);
    }
    
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, loop]);
  
  // Cancel loop manually
  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);
  
  return { cancel };
}
