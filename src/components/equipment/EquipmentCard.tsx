import { Pencil, QrCode, Shield, ShieldAlert, ShieldOff } from 'lucide-react';
import { Equipment } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { getEquipmentImage } from './EquipmentImageMap';

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
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, color: 'text-warning', icon: ShieldAlert, bg: 'bg-warning/10' };
  return { label: 'Active', color: 'text-success', icon: Shield, bg: 'bg-success/10' };
}

export default function EquipmentCard({ equipment, index, onEdit, onQr }: EquipmentCardProps) {
  const warranty = getWarrantyInfo(equipment);
  const WarrantyIcon = warranty.icon;
  const image = getEquipmentImage(index);

  return (
    <div
      className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image area */}
      <div className="relative bg-gradient-to-b from-secondary/60 to-secondary/20 p-4 flex items-center justify-center h-48 overflow-hidden">
        <img
          src={image}
          alt={equipment.name}
          loading="lazy"
          className="h-36 w-36 object-contain group-hover:scale-110 transition-transform duration-500"
        />
        {/* Warranty badge */}
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${warranty.bg} ${warranty.color}`}>
          <WarrantyIcon size={10} />
          {warranty.label}
        </span>
        {/* Action buttons overlay */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-xl bg-card/90 backdrop-blur-sm shadow-md hover:bg-primary hover:text-primary-foreground"
            onClick={() => onEdit(equipment)}
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-xl bg-card/90 backdrop-blur-sm shadow-md hover:bg-primary hover:text-primary-foreground"
            onClick={() => onQr(equipment)}
          >
            <QrCode size={13} />
          </Button>
        </div>
      </div>

      {/* Info area */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-foreground text-sm leading-tight truncate">{equipment.name}</h3>
        <p className="text-[11px] text-muted-foreground font-medium">{equipment.modelNumber}</p>
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">{equipment.customerName}</span>
          <span className="text-[10px] font-mono text-muted-foreground/70">{equipment.serialNumber?.slice(0, 12)}</span>
        </div>
      </div>
    </div>
  );
}
