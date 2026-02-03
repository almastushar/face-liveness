// Visual direction guide overlay with smooth animations

import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LivenessStep } from '@/types/liveness';

interface DirectionGuideProps {
  currentStep: LivenessStep;
  progress: number; // 0-100 representing how close to target
}

export function DirectionGuide({ currentStep, progress }: DirectionGuideProps) {
  if (!['TURN_LEFT', 'TURN_RIGHT', 'TURN_UP', 'TURN_DOWN'].includes(currentStep)) {
    return null;
  }

  const getArrowConfig = () => {
    // Positions are mirrored to match the camera's mirror view
    // When user turns left, their head moves to the RIGHT side of the screen
    switch (currentStep) {
      case 'TURN_LEFT':
        return { Icon: ArrowLeft, position: 'right-3 sm:right-6 top-1/2 -translate-y-1/2', animate: 'animate-bounce-right' };
      case 'TURN_RIGHT':
        return { Icon: ArrowRight, position: 'left-3 sm:left-6 top-1/2 -translate-y-1/2', animate: 'animate-bounce-left' };
      case 'TURN_UP':
        return { Icon: ArrowUp, position: 'top-3 sm:top-6 left-1/2 -translate-x-1/2', animate: 'animate-bounce-up' };
      case 'TURN_DOWN':
        return { Icon: ArrowDown, position: 'bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2', animate: 'animate-bounce-down' };
      default:
        return null;
    }
  };

  const config = getArrowConfig();
  if (!config) return null;

  const { Icon, position, animate } = config;
  const isNearTarget = progress > 70;

  return (
    <div
      className={cn(
        "absolute z-10 animate-fade-in-scale",
        position,
        animate
      )}
    >
      {/* Outer glow ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-500 ease-out",
          isNearTarget 
            ? "bg-success/20 scale-150 blur-md" 
            : "bg-primary/20 scale-125 blur-sm"
        )}
      />
      
      {/* Progress ring */}
      <svg 
        className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 -m-1 sm:-m-1 -rotate-90"
        viewBox="0 0 64 64"
      >
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${progress * 1.76} 176`}
          className={cn(
            "transition-all duration-200 ease-out",
            isNearTarget ? "text-success" : "text-primary"
          )}
        />
      </svg>
      
      {/* Main button */}
      <div
        className={cn(
          "relative flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-full",
          "backdrop-blur-md transition-all duration-300 ease-out",
          "shadow-lg",
          isNearTarget 
            ? "bg-success/90 text-success-foreground scale-110" 
            : "bg-primary/90 text-primary-foreground"
        )}
      >
        <Icon className={cn(
          "w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-200",
          isNearTarget && "scale-110"
        )} />
      </div>
    </div>
  );
}
