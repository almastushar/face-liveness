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
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary">
              Verification Complete!
            </CardTitle>
            <CardDescription>
              Your face liveness has been successfully verified
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {result && (
              <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
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
                  <span className="font-mono text-xs">
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
