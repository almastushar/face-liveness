// Instruction panel component

import { STEP_INSTRUCTIONS, LivenessStep, STEP_ORDER } from '@/types/liveness';
import { cn } from '@/lib/utils';

interface InstructionPanelProps {
  currentStep: LivenessStep;
  stepNumber: number;
  error: string | null;
}

export function InstructionPanel({ currentStep, stepNumber, error }: InstructionPanelProps) {
  const instruction = STEP_INSTRUCTIONS[currentStep];
  const totalSteps = STEP_ORDER.length;
  
  return (
    <div className="text-center space-y-3 py-4">
      {/* Step indicator */}
      {currentStep !== 'IDLE' && currentStep !== 'SUCCESS' && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Step {stepNumber} of {totalSteps}
          </span>
          <div className="flex gap-1">
            {STEP_ORDER.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-300",
                  index < stepNumber
                    ? "bg-primary"
                    : index === stepNumber - 1
                    ? "bg-primary animate-pulse"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Main instruction */}
      <p className={cn(
        "text-xl font-semibold transition-colors duration-300",
        error ? "text-destructive" : "text-foreground"
      )}>
        {error || instruction}
      </p>
      
      {/* Sub-instruction for specific steps */}
      {!error && currentStep === 'BLINK' && (
        <p className="text-sm text-muted-foreground">
          Close and open your eyes naturally
        </p>
      )}
      
      {!error && (currentStep === 'TURN_LEFT' || currentStep === 'TURN_RIGHT' || 
                  currentStep === 'TURN_UP' || currentStep === 'TURN_DOWN') && (
        <p className="text-sm text-muted-foreground">
          Hold the position briefly
        </p>
      )}
    </div>
  );
}
