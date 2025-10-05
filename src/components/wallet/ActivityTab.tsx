import { History } from 'lucide-react';

export function ActivityTab() {
  return (
    <div className="px-6 py-12 text-center">
      <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-muted-foreground mb-1">No activity yet</p>
      <p className="text-sm text-muted-foreground">
        Your transactions will appear here
      </p>
    </div>
  );
}
