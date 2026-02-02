// Visual direction guide overlay for head turn steps

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
    switch (currentStep) {
      case 'TURN_LEFT':
        return { Icon: ArrowLeft, position: 'left-2 sm:left-4 top-1/2 -translate-y-1/2', animate: 'animate-bounce-left' };
      case 'TURN_RIGHT':
        return { Icon: ArrowRight, position: 'right-2 sm:right-4 top-1/2 -translate-y-1/2', animate: 'animate-bounce-right' };
      case 'TURN_UP':
        return { Icon: ArrowUp, position: 'top-2 sm:top-4 left-1/2 -translate-x-1/2', animate: 'animate-bounce-up' };
      case 'TURN_DOWN':
        return { Icon: ArrowDown, position: 'bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2', animate: 'animate-bounce-down' };
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
        "absolute z-10 transition-all duration-300",
        position,
        animate
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-full backdrop-blur-sm transition-all duration-300",
          isNearTarget 
            ? "bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))] scale-110" 
            : "bg-primary/80 text-primary-foreground"
        )}
      >
        <Icon className="w-5 h-5 sm:w-8 sm:h-8" />
      </div>
    </div>
  );
}
