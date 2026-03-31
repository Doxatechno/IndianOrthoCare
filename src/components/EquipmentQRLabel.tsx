import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: {
    id: string;
    name: string;
    modelNumber: string;
    serialNumber: string;
    customerName: string;
  };
}

export default function EquipmentQRLabel({ open, onOpenChange, equipment }: Props) {
  const labelRef = useRef<HTMLDivElement>(null);
  const baseUrl = 'https://meditech-care.lovable.app';
  const ticketUrl = `${baseUrl}/raise-ticket/${equipment.id}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !labelRef.current) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Equipment Label - ${equipment.name}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui, sans-serif; }
            .label { border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px; width: 320px; text-align: center; }
            .company { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 12px; }
            .name { font-size: 16px; font-weight: 700; color: #1f2937; margin: 8px 0 4px; }
            .detail { font-size: 11px; color: #6b7280; margin: 2px 0; }
            .qr { margin: 16px auto; }
            .scan-text { font-size: 10px; color: #9ca3af; margin-top: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="company">Doxa CareX</div>
            ${labelRef.current.querySelector('.qr-container')?.innerHTML || ''}
            <div class="name">${equipment.name}</div>
            <div class="detail">${equipment.modelNumber} · ${equipment.serialNumber}</div>
            <div class="detail">${equipment.customerName}</div>
            <div class="scan-text">Scan QR to raise a service ticket</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const handleDownload = () => {
    const svg = labelRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `QR-${equipment.id}-${equipment.name.replace(/\s/g, '_')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-center">Equipment QR Label</DialogTitle>
        </DialogHeader>
        <div ref={labelRef} className="flex flex-col items-center py-4 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Doxa CareX</p>
          <div className="qr-container p-3 bg-white rounded-xl border border-border shadow-sm">
            <QRCodeSVG value={ticketUrl} size={180} level="H" includeMargin={false} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-foreground">{equipment.name}</p>
            <p className="text-xs text-muted-foreground">{equipment.modelNumber} · {equipment.serialNumber}</p>
            <p className="text-xs text-muted-foreground">{equipment.customerName}</p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center">Scan to raise a service ticket</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={handleDownload}>
            <Download size={14} /> Download QR
          </Button>
          <Button className="flex-1 rounded-xl gap-2" onClick={handlePrint}>
            <Printer size={14} /> Print Label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
