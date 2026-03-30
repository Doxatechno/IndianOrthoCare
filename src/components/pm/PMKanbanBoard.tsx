import { CalendarCheck, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';
import type { PMSchedule, PMStatus, Technician } from '@/data/mockData';

interface PMKanbanBoardProps {
  pmSchedules: PMSchedule[];
  technicians: Technician[];
  onAssign: (pmId: string, techName: string) => void;
  onStatusChange: (pmId: string, status: PMStatus) => void;
  workloadMap: Record<string, number>;
}

function PMCard({ pm, technicians, onAssign, onStatusChange, workloadMap }: {
  pm: PMSchedule;
  technicians: Technician[];
  onAssign: (pmId: string, techName: string) => void;
  onStatusChange: (pmId: string, status: PMStatus) => void;
  workloadMap: Record<string, number>;
}) {
  const isOverdue = new Date(pm.plannedDate) < new Date() && pm.status !== 'Completed';

  return (
    <div className={`glass-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 ${
      isOverdue ? 'ring-1 ring-destructive/40' : ''
    } ${!pm.assignedTechnician && pm.status === 'Pending' ? 'ring-1 ring-warning/40' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-primary">PM{pm.pmNumber}</span>
        {isOverdue && <AlertCircle size={12} className="text-destructive" />}
      </div>

      {/* Equipment info */}
      <p className="text-sm font-bold text-foreground leading-tight mb-0.5">{pm.equipmentName}</p>
      <p className="text-[11px] text-muted-foreground mb-2">{pm.customerName}</p>

      {/* Date */}
      <div className="flex items-center gap-1.5 mb-3">
        <CalendarCheck size={11} className="text-primary/60" />
        <span className={`text-[11px] ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
          {pm.plannedDate}
        </span>
      </div>

      {/* Technician assignment */}
      <Select value={pm.assignedTechnician || ''} onValueChange={v => onAssign(pm.id, v)}>
        <SelectTrigger className={`h-8 text-[11px] rounded-lg mb-2 ${
          !pm.assignedTechnician ? 'border-warning/50 bg-warning/5' : 'border-border'
        }`}>
          <User size={11} className="mr-1 shrink-0" />
          <SelectValue placeholder="Assign technician" />
        </SelectTrigger>
        <SelectContent>
          {technicians.filter(t => t.isActive).map(t => (
            <SelectItem key={t.id} value={t.name} className="text-xs">
              {t.name} ({workloadMap[t.id] ?? 0} pending)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status change */}
      <Select value={pm.status} onValueChange={v => onStatusChange(pm.id, v as PMStatus)}>
        <SelectTrigger className="h-8 text-[11px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(['Pending', 'Assigned', 'Completed'] as PMStatus[]).map(s => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PMKanbanBoard({ pmSchedules, technicians, onAssign, onStatusChange, workloadMap }: PMKanbanBoardProps) {
  const columns: { status: PMStatus; label: string; icon: typeof Clock; gradient: string }[] = [
    { status: 'Pending', label: 'Pending', icon: Clock, gradient: 'from-warning/20 to-warning/5' },
    { status: 'Assigned', label: 'Assigned', icon: User, gradient: 'from-info/20 to-info/5' },
    { status: 'Completed', label: 'Completed', icon: CheckCircle2, gradient: 'from-success/20 to-success/5' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => {
        const items = pmSchedules.filter(p => p.status === col.status);
        return (
          <div key={col.status} className="space-y-3">
            {/* Column header */}
            <div className={`rounded-xl bg-gradient-to-b ${col.gradient} p-3 border border-border/30`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <col.icon size={14} className="text-foreground/70" />
                  <span className="text-sm font-bold text-foreground">{col.label}</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-2.5 min-h-[100px]">
              {items.map(pm => (
                <PMCard
                  key={pm.id}
                  pm={pm}
                  technicians={technicians}
                  onAssign={onAssign}
                  onStatusChange={onStatusChange}
                  workloadMap={workloadMap}
                />
              ))}
              {items.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-border/40 p-6 text-center">
                  <p className="text-xs text-muted-foreground">No items</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
