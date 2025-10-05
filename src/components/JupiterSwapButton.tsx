import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownUp } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { JupiterTerminal } from './JupiterTerminal';

interface JupiterSwapButtonProps {
  address: string;
}

export function JupiterSwapButton({ address }: JupiterSwapButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full h-12 border-border bg-card hover:bg-accent"
      >
        <ArrowDownUp className="mr-2 h-5 w-5" />
        Swap Solana do $TRAPANI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] bg-background border-border p-0 overflow-hidden">
          <JupiterTerminal onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
