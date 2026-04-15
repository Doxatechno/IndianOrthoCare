import { CalendarCheck, User, Clock, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  const isCompleted = pm.status === 'Completed';

  return (
    <div className={`group relative rounded-2xl border bg-card/80 backdrop-blur-sm p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
      isOverdue ? 'border-destructive/40 bg-destructive/5' : ''
    } ${!pm.assignedTechnician && pm.status === 'Pending' ? 'border-warning/40 bg-warning/5' : ''
    } ${isCompleted ? 'border-success/20 opacity-80' : 'border-border/60'}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
            PM-Q{pm.pmNumber}
          </span>
          {isOverdue && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 animate-pulse">
              Overdue
            </Badge>
          )}
        </div>
        {isCompleted && <CheckCircle2 size={14} className="text-success" />}
      </div>

      {/* Equipment info */}
      <p className="text-sm font-bold text-foreground leading-tight mb-0.5">{pm.equipmentName}</p>
      <p className="text-[11px] text-muted-foreground mb-3">{pm.customerName}</p>

      {/* Date */}
      <div className="flex items-center gap-1.5 mb-3 rounded-lg bg-secondary/50 px-2.5 py-1.5">
        <CalendarCheck size={12} className="text-primary/60" />
        <span className={`text-[11px] font-medium ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
          {new Date(pm.plannedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Technician assignment */}
      <Select value={pm.assignedTechnician || ''} onValueChange={v => onAssign(pm.id, v)}>
        <SelectTrigger className={`h-9 text-[11px] rounded-xl mb-2 ${
          !pm.assignedTechnician ? 'border-warning/50 bg-warning/5 border-dashed' : 'border-border'
        }`}>
          <User size={12} className="mr-1.5 shrink-0" />
          <SelectValue placeholder="⚡ Assign technician" />
        </SelectTrigger>
        <SelectContent>
          {technicians.filter(t => t.isActive).map(t => (
            <SelectItem key={t.id} value={t.name} className="text-xs">
              <span className="flex items-center gap-2">
                {t.name}
                <span className="text-muted-foreground">({workloadMap[t.id] ?? 0} active)</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status change */}
      <Select value={pm.status} onValueChange={v => onStatusChange(pm.id, v as PMStatus)}>
        <SelectTrigger className="h-9 text-[11px] rounded-xl">
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
  const columns: { status: PMStatus; label: string; icon: typeof Clock; gradient: string; iconBg: string }[] = [
    { status: 'Pending', label: 'Pending', icon: Clock, gradient: 'from-warning/20 to-warning/5', iconBg: 'bg-warning/15 text-warning' },
    { status: 'Assigned', label: 'Assigned', icon: User, gradient: 'from-info/20 to-info/5', iconBg: 'bg-info/15 text-info' },
    { status: 'Completed', label: 'Completed', icon: CheckCircle2, gradient: 'from-success/20 to-success/5', iconBg: 'bg-success/15 text-success' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {columns.map(col => {
        const items = pmSchedules.filter(p => p.status === col.status);
        return (
          <div key={col.status} className="space-y-3">
            {/* Column header */}
            <div className={`rounded-2xl bg-gradient-to-b ${col.gradient} p-4 border border-border/30`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${col.iconBg} flex items-center justify-center`}>
                    <col.icon size={14} />
                  </div>
                  <span className="text-sm font-bold text-foreground">{col.label}</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-card/80 px-2.5 py-1 rounded-lg border border-border/40">
                  {items.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[120px]">
              {items.map((pm, i) => (
                <div key={pm.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <PMCard
                    pm={pm}
                    technicians={technicians}
                    onAssign={onAssign}
                    onStatusChange={onStatusChange}
                    workloadMap={workloadMap}
                  />
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border/40 p-8 text-center">
                  <col.icon size={20} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/60">No items</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
