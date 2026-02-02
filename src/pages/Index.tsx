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
        <main>
          <FaceLiveness onSuccess={handleSuccess} />
        </main>
      </div>
    </div>
  );
};

export default Index;
