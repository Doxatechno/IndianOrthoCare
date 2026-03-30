import { CalendarCheck, User, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';
import type { PMSchedule, PMStatus, Technician } from '@/data/mockData';

interface PMListViewProps {
  pmSchedules: PMSchedule[];
  technicians: Technician[];
  onAssign: (pmId: string, techName: string) => void;
  onStatusChange: (pmId: string, status: PMStatus) => void;
  workloadMap: Record<string, number>;
}

const allStatuses: PMStatus[] = ['Pending', 'Assigned', 'Completed'];

export default function PMListView({ pmSchedules, technicians, onAssign, onStatusChange, workloadMap }: PMListViewProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/40">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">PM</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Equipment</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Customer</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Planned Date</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Technician</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {pmSchedules.map(p => {
                const isOverdue = new Date(p.plannedDate) < new Date() && p.status !== 'Completed';
                return (
                  <tr key={p.id} className={`hover:bg-secondary/30 transition-colors ${
                    !p.assignedTechnician && p.status === 'Pending' ? 'bg-warning/5' : ''
                  } ${isOverdue ? 'bg-destructive/5' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">PM{p.pmNumber}</span>
                        {isOverdue && <AlertCircle size={12} className="text-destructive" />}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-foreground">{p.equipmentName}</p>
                      <p className="text-[11px] text-muted-foreground">{p.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{p.customerName}</td>
                    <td className={`px-5 py-3.5 text-[12px] ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {p.plannedDate}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3.5">
                      <Select value={p.assignedTechnician || ''} onValueChange={v => onAssign(p.id, v)}>
                        <SelectTrigger className={`h-8 text-xs w-32 rounded-lg ${!p.assignedTechnician ? 'border-warning/50 bg-warning/5' : ''}`}>
                          <SelectValue placeholder="⚠ Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.filter(t => t.isActive).map(t => (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name} ({workloadMap[t.id] ?? 0} pending)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3.5">
                      <Select value={p.status} onValueChange={v => onStatusChange(p.id, v as PMStatus)}>
                        <SelectTrigger className="h-8 text-xs w-28 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {pmSchedules.map((p, i) => {
          const isOverdue = new Date(p.plannedDate) < new Date() && p.status !== 'Completed';
          return (
            <div key={p.id} className={`glass-card p-4 animate-fade-in ${
              !p.assignedTechnician && p.status === 'Pending' ? 'ring-1 ring-warning/40' : ''
            } ${isOverdue ? 'ring-1 ring-destructive/40' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">PM{p.pmNumber}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.equipmentName}</p>
                    <p className="text-[11px] text-muted-foreground">{p.customerName}</p>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className={`text-[11px] mb-3 flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                <CalendarCheck size={12} className="text-primary/60" />
                Planned: {p.plannedDate}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Select value={p.assignedTechnician || ''} onValueChange={v => onAssign(p.id, v)}>
                  <SelectTrigger className={`h-9 text-xs rounded-xl ${!p.assignedTechnician ? 'border-warning/50 bg-warning/5' : ''}`}>
                    <SelectValue placeholder="⚠ Assign tech" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.filter(t => t.isActive).map(t => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name} ({workloadMap[t.id] ?? 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={p.status} onValueChange={v => onStatusChange(p.id, v as PMStatus)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
