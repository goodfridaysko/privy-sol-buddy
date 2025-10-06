import { Shield, Info } from 'lucide-react';

export function StatusBar() {
  return (
    <div className="flex items-center gap-2 p-4 bg-muted/20 rounded-lg border border-border/50">
      <Shield className="h-4 w-4 text-primary shrink-0" />
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Non-custodial.</span> You control your keys.{' '}
        <span className="inline-flex items-center gap-1">
          <Info className="h-3 w-3" />
          Not investment advice.
        </span>
      </p>
    </div>
  );
}
