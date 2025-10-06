import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useBalance } from '@/hooks/useBalance';
import { MIN_SOL_AMOUNT } from '@/config/swap';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PrimaryCTAStackProps {
  address: string;
  onBuySOL: () => void;
  onSwap: () => void;
}

export function PrimaryCTAStack({ address, onBuySOL, onSwap }: PrimaryCTAStackProps) {
  const { data: solBalance = 0 } = useBalance(address);
  
  const hasEnoughSOL = solBalance >= MIN_SOL_AMOUNT;

  return (
    <div className="space-y-3">
      {/* Buy SOL Button */}
      <Button 
        onClick={onBuySOL}
        size="lg"
        className="w-full h-14 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Buy SOL to buy $TRAPANI
      </Button>

      {/* Swap Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button
                onClick={onSwap}
                size="lg"
                disabled={!hasEnoughSOL}
                className="w-full h-14 text-base font-semibold bg-gradient-accent hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightLeft className="mr-2 h-5 w-5" />
                Swap SOL → $TRAPANI
              </Button>
              {!hasEnoughSOL && (
                <div className="absolute -top-1 -right-1 bg-destructive rounded-full p-1">
                  <AlertCircle className="h-4 w-4 text-destructive-foreground" />
                </div>
              )}
            </div>
          </TooltipTrigger>
          {!hasEnoughSOL && (
            <TooltipContent>
              <p>You need at least {MIN_SOL_AMOUNT} SOL to swap</p>
              <p className="text-xs text-muted-foreground mt-1">Buy SOL first</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* MoonPay Attribution */}
      <p className="text-xs text-center text-muted-foreground">
        Powered by MoonPay • Swap by Jupiter
      </p>
    </div>
  );
}
