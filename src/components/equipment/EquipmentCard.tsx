import { Pencil, QrCode, Shield, ShieldAlert, ShieldOff, Cpu } from 'lucide-react';
import { Equipment } from '@/data/mockData';
import { Button } from '@/components/ui/button';

interface EquipmentCardProps {
  equipment: Equipment;
  index: number;
  onEdit: (e: Equipment) => void;
  onQr: (e: Equipment) => void;
}

function getWarrantyInfo(e: Equipment) {
  if (!e.warrantyEndDate) return { label: 'No Warranty', color: 'text-muted-foreground', icon: ShieldOff, bg: 'bg-muted' };
  const end = new Date(e.warrantyEndDate);
  const now = new Date();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: 'Expired', color: 'text-destructive', icon: ShieldOff, bg: 'bg-destructive/10' };
  if (daysLeft <= 180) return { label: `${daysLeft}d left`, color: 'text-warning', icon: ShieldAlert, bg: 'bg-warning/10' };
  return { label: 'Active', color: 'text-success', icon: Shield, bg: 'bg-success/10' };
}

export default function EquipmentCard({ equipment, index, onEdit, onQr }: EquipmentCardProps) {
  const warranty = getWarrantyInfo(equipment);
  const WarrantyIcon = warranty.icon;

  return (
    <div
      className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header with icon */}
      <div className="relative bg-gradient-to-b from-secondary/60 to-secondary/20 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Cpu size={18} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-foreground text-sm leading-tight truncate">{equipment.name}</h3>
          <p className="text-[11px] text-muted-foreground font-medium">{equipment.modelNumber}</p>
        </div>
        {/* Warranty badge */}
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${warranty.bg} ${warranty.color} shrink-0`}>
          <WarrantyIcon size={10} />
          {warranty.label}
        </span>
      </div>

      {/* Info area */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Serial No.</span>
          <span className="font-mono text-foreground">{equipment.serialNumber}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Customer</span>
          <span className="text-foreground truncate max-w-[60%] text-right">{equipment.customerName}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Installed</span>
          <span className="text-foreground">{equipment.installationDate || '—'}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Warranty End</span>
          <span className="text-foreground">{equipment.warrantyEndDate || '—'}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border/40">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 rounded-xl h-8 text-xs gap-1.5"
            onClick={() => onEdit(equipment)}
          >
            <Pencil size={12} /> Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 rounded-xl h-8 text-xs gap-1.5"
            onClick={() => onQr(equipment)}
          >
            <QrCode size={12} /> QR Label
          </Button>
        </div>
      </div>
    </div>
  );
}
