import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createTransferTransaction, isValidSolanaAddress } from '@/lib/solana';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';

interface SendSolFormProps {
  onSuccess?: () => void;
}

export function SendSolForm({ onSuccess }: SendSolFormProps) {
  const { wallet, address: fromAddress } = useEmbeddedSolWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to || !amount || !fromAddress || !wallet) return;

    // Validate inputs
    if (!isValidSolanaAddress(to)) {
      toast.error('Invalid recipient address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount');
      return;
    }

    setSending(true);
    try {
      // Create transaction
      const transaction = await createTransferTransaction(
        new PublicKey(fromAddress),
        to,
        amountNum
      );

      // Convert to VersionedTransaction (Privy compatibility)
      const versionedTx = new VersionedTransaction(transaction.compileMessage());

      // Sign and send with Privy wallet
      // @ts-ignore - Privy wallet types
      const signature = await wallet.sendTransaction(versionedTx);

      toast.success(`Sent ${amount} SOL!`, {
        description: `Transaction: ${signature}`,
      });

      setTo('');
      setAmount('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error('Failed to send SOL', {
        description: error?.message || 'Unknown error',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="recipient">Recipient Address</Label>
        <Input
          id="recipient"
          placeholder="Enter Solana address"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-muted border-border"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (SOL)</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-muted border-border"
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={!to || !amount || sending}
        className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
      >
        {sending ? 'Sending...' : 'Send SOL'}
      </Button>
    </div>
  );
}
