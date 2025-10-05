import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, CreditCard } from 'lucide-react';

interface ActionButtonsProps {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
  onBuy: () => void;
}

export function ActionButtons({ onSend, onReceive, onSwap, onBuy }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 px-6 py-4">
      <button
        onClick={onBuy}
        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xs font-medium">Buy</span>
      </button>

      <button
        onClick={onSend}
        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
          <ArrowUpRight className="h-5 w-5 text-secondary" />
        </div>
        <span className="text-xs font-medium">Send</span>
      </button>

      <button
        onClick={onReceive}
        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
          <ArrowDownLeft className="h-5 w-5 text-accent" />
        </div>
        <span className="text-xs font-medium">Receive</span>
      </button>

      <button
        onClick={onSwap}
        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium">Swap</span>
      </button>
    </div>
  );
}
