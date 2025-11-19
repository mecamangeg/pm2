import { ProcessWizard } from '@/components/process/ProcessWizard';

export function NewProcess() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Process</h1>
        <p className="text-muted-foreground">
          Create and configure a new PM2 process
        </p>
      </div>

      <ProcessWizard />
    </div>
  );
}
