// Update this page (the content is just a fallback if you fail to update the page)

import { FaceLiveness } from '@/components/FaceLiveness';
import { LivenessResult } from '@/types/liveness';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { toast } = useToast();
  
  const handleSuccess = (result: LivenessResult) => {
    console.log('Liveness verification complete:', result);
    toast({
      title: "Verification Successful",
      description: `Completed ${result.stepsCompleted.length} steps at ${result.timestamp.toLocaleTimeString()}`,
    });
  };
  
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Face Liveness Verification
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A browser-based face liveness verification system using TensorFlow.js and MediaPipe FaceMesh.
            All processing happens locally in your browser.
          </p>
        </header>
        
        <main>
          <FaceLiveness onSuccess={handleSuccess} />
        </main>
        
        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            <strong>Research Use Only:</strong> This is a heuristic challenge-response system,
            not a certified PAD (Presentation Attack Detection) solution.
          </p>
          <p className="mt-2">
            HTTPS is required for camera access on mobile devices.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
