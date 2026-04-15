import { CalendarCheck, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
              <tr className="border-b border-border/50 bg-gradient-to-r from-secondary/60 to-secondary/30">
                <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">PM</th>
                <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Equipment</th>
                <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Customer</th>
                <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Planned Date</th>
                <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Technician</th>
                <th className="px-5 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {pmSchedules.map((p, i) => {
                const isOverdue = new Date(p.plannedDate) < new Date() && p.status !== 'Completed';
                return (
                  <tr key={p.id} className={`transition-all duration-200 hover:bg-secondary/30 animate-fade-in ${
                    !p.assignedTechnician && p.status === 'Pending' ? 'bg-warning/5' : ''
                  } ${isOverdue ? 'bg-destructive/5' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-xs">PM-Q{p.pmNumber}</span>
                        {isOverdue && <AlertCircle size={12} className="text-destructive" />}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{p.equipmentName}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell">{p.customerName}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                        isOverdue ? 'text-destructive bg-destructive/10 font-bold' : 'text-muted-foreground bg-secondary/50'
                      }`}>
                        {new Date(p.plannedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-4">
                      <Select value={p.assignedTechnician || ''} onValueChange={v => onAssign(p.id, v)}>
                        <SelectTrigger className={`h-9 text-xs w-36 rounded-xl ${!p.assignedTechnician ? 'border-warning/50 bg-warning/5 border-dashed' : ''}`}>
                          <SelectValue placeholder="⚡ Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.filter(t => t.isActive).map(t => (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name} ({workloadMap[t.id] ?? 0} active)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4">
                      <Select value={p.status} onValueChange={v => onStatusChange(p.id, v as PMStatus)}>
                        <SelectTrigger className="h-9 text-xs w-32 rounded-xl"><SelectValue /></SelectTrigger>
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
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">Q{p.pmNumber}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.equipmentName}</p>
                    <p className="text-[11px] text-muted-foreground">{p.customerName}</p>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className={`text-[11px] mb-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
                isOverdue ? 'text-destructive bg-destructive/10 font-bold' : 'text-muted-foreground bg-secondary/50'
              }`}>
                <CalendarCheck size={12} className="text-primary/60" />
                {new Date(p.plannedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={p.assignedTechnician || ''} onValueChange={v => onAssign(p.id, v)}>
                  <SelectTrigger className={`h-9 text-xs rounded-xl ${!p.assignedTechnician ? 'border-warning/50 bg-warning/5 border-dashed' : ''}`}>
                    <SelectValue placeholder="⚡ Assign tech" />
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
