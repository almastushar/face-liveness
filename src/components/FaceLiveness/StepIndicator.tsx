// Modern step indicator with icons and animations

import { Check, Eye, MoveLeft, MoveRight, MoveUp, MoveDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LivenessStep } from '@/types/liveness';

interface StepIndicatorProps {
  currentStep: LivenessStep;
  completedSteps: LivenessStep[];
  stepOrder: LivenessStep[];
}

const STEP_ICONS: Record<LivenessStep, React.ElementType> = {
  IDLE: User,
  ALIGN: User,
  BLINK: Eye,
  TURN_LEFT: MoveLeft,
  TURN_RIGHT: MoveRight,
  TURN_UP: MoveUp,
  TURN_DOWN: MoveDown,
  SUCCESS: Check,
};

const STEP_LABELS: Record<LivenessStep, string> = {
  IDLE: 'Ready',
  ALIGN: 'Align',
  BLINK: 'Blink',
  TURN_LEFT: 'Left',
  TURN_RIGHT: 'Right',
  TURN_UP: 'Up',
  TURN_DOWN: 'Down',
  SUCCESS: 'Done',
};

export function StepIndicator({ currentStep, completedSteps, stepOrder }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 px-2">
      {stepOrder.map((step, index) => {
        const Icon = STEP_ICONS[step];
        const isCompleted = completedSteps.includes(step);
        const isCurrent = currentStep === step;
        const isPending = !isCompleted && !isCurrent;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300",
                  isCompleted && "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] scale-100",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium transition-colors",
                  isCompleted && "text-[hsl(var(--success))]",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            
            {index < stepOrder.length - 1 && (
              <div
                className={cn(
                  "w-4 sm:w-8 h-0.5 mx-0.5 sm:mx-1 transition-colors duration-300 -mt-5",
                  isCompleted ? "bg-[hsl(var(--success))]" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
