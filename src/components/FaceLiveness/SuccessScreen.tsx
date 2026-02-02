// Success screen component

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import type { LivenessResult } from '@/types/liveness';

interface SuccessScreenProps {
  result: LivenessResult | null;
  onRestart: () => void;
}

export function SuccessScreen({ result, onRestart }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] sm:min-h-[400px] p-4 sm:p-6">
      <div className="animate-in fade-in zoom-in duration-500 w-full">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
          </div>
        </div>
        
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center pb-2 sm:pb-4">
            <CardTitle className="text-xl sm:text-2xl text-primary">
              Verification Complete!
            </CardTitle>
            <CardDescription className="text-sm">
              Your face liveness has been successfully verified
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3 sm:space-y-4">
            {result && (
              <div className="bg-muted rounded-lg p-3 sm:p-4 text-xs sm:text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-mono">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Steps Completed:</span>
                  <span className="font-mono">
                    {result.stepsCompleted.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">
                    {result.deviceInfo.platform}
                  </span>
                </div>
              </div>
            )}
            
            <Button 
              onClick={onRestart} 
              className="w-full"
              size="lg"
            >
              Verify Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
