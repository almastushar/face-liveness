// Modern action prompt with animated feedback

import { Eye, User, MoveLeft, MoveRight, MoveUp, MoveDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LivenessStep, STEP_INSTRUCTIONS } from '@/types/liveness';

interface ActionPromptProps {
  currentStep: LivenessStep;
  error: string | null;
  isCalibrating?: boolean;
}

const STEP_ICONS: Record<LivenessStep, React.ElementType> = {
  IDLE: User,
  ALIGN: User,
  BLINK: Eye,
  TURN_LEFT: MoveLeft,
  TURN_RIGHT: MoveRight,
  TURN_UP: MoveUp,
  TURN_DOWN: MoveDown,
  SUCCESS: CheckCircle2,
};

export function ActionPrompt({ currentStep, error, isCalibrating }: ActionPromptProps) {
  const Icon = error ? AlertCircle : STEP_ICONS[currentStep];
  const instruction = error || STEP_INSTRUCTIONS[currentStep];

  const getSubtext = () => {
    if (error) return null;
    if (isCalibrating && currentStep === 'BLINK') return 'Calibrating eye detection...';
    if (currentStep === 'BLINK') return 'Close and open your eyes naturally';
    if (currentStep === 'ALIGN') return 'Position your face within the frame';
    if (['TURN_LEFT', 'TURN_RIGHT', 'TURN_UP', 'TURN_DOWN'].includes(currentStep)) {
      return 'Hold the position briefly';
    }
    return null;
  };

  const subtext = getSubtext();

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
        error 
          ? "bg-destructive/10 border border-destructive/20" 
          : "bg-card border border-border shadow-lg"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
          error 
            ? "bg-destructive/10 text-destructive" 
            : "bg-primary/10 text-primary"
        )}
      >
        <Icon className={cn("w-6 h-6", !error && currentStep === 'BLINK' && "animate-pulse")} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-semibold text-lg truncate transition-colors",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {instruction}
        </p>
        {subtext && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  );
}
