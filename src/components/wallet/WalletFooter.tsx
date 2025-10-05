import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface WalletFooterProps {
  onRestart: () => void;
}

export function WalletFooter({ onRestart }: WalletFooterProps) {
  return (
    <footer className="border-t border-border mt-8 py-4 px-6">
      <Button
        variant="outline"
        onClick={onRestart}
        className="w-full"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Restart App
      </Button>
    </footer>
  );
}
