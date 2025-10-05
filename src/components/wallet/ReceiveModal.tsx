import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

interface ReceiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
}

export function ReceiveModal({ open, onOpenChange, address }: ReceiveModalProps) {
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = 'solana-address-qr.png';
      downloadLink.href = pngFile;
      downloadLink.click();
      
      toast.success('QR code downloaded');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-card border-border">
        <DialogHeader>
          <DialogTitle>Receive SOL</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center p-6 bg-white rounded-lg">
            <QRCode
              id="qr-code"
              value={address}
              size={200}
              level="H"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Your Solana Address
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <code className="text-xs font-mono break-all block text-center">
                {address}
              </code>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={copyAddress}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Address
            </Button>
            <Button
              variant="outline"
              onClick={downloadQR}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Save QR
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Only send SOL and SPL tokens to this address
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
