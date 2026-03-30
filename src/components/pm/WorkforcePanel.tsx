import { useMemo } from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PMSchedule, Technician } from '@/data/mockData';

interface WorkforcePanelProps {
  technicians: Technician[];
  pmSchedules: PMSchedule[];
}

export default function WorkforcePanel({ technicians, pmSchedules }: WorkforcePanelProps) {
  const stats = useMemo(() => {
    const unassigned = pmSchedules.filter(p => !p.assignedTechnician && p.status === 'Pending').length;
    const assigned = pmSchedules.filter(p => p.status === 'Assigned').length;
    const completed = pmSchedules.filter(p => p.status === 'Completed').length;
    const total = pmSchedules.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const activeTechs = technicians.filter(t => t.isActive);
    const workload = activeTechs.map(tech => {
      const pending = pmSchedules.filter(p => p.assignedTechnician === tech.name && p.status !== 'Completed').length;
      const done = pmSchedules.filter(p => p.assignedTechnician === tech.name && p.status === 'Completed').length;
      return { ...tech, pending, done, total: pending + done };
    }).sort((a, b) => b.pending - a.pending);

    return { unassigned, assigned, completed, total, completionRate, workload };
  }, [technicians, pmSchedules]);

  const maxPending = Math.max(...stats.workload.map(w => w.pending), 1);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header with key metrics */}
      <div className="p-5 pb-0">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Users size={16} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Workforce Overview</h3>
            <p className="text-[11px] text-muted-foreground">{stats.workload.length} active technicians</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-2xl font-bold text-foreground">{stats.completionRate}%</span>
            <span className="text-[10px] text-muted-foreground">completed</span>
          </div>
        </div>

        {/* Mini stat pills */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Unassigned', value: stats.unassigned, icon: AlertTriangle, color: 'text-warning bg-warning/10 border-warning/20' },
            { label: 'Assigned', value: stats.assigned, icon: Users, color: 'text-info bg-info/10 border-info/20' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-success bg-success/10 border-success/20' },
            { label: 'Total PMs', value: stats.total, icon: TrendingUp, color: 'text-primary bg-primary/10 border-primary/20' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-2.5 text-center ${stat.color}`}>
              <stat.icon size={14} className="mx-auto mb-1 opacity-70" />
              <p className="text-lg font-bold leading-none">{stat.value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technician workload visualization */}
      <div className="px-5 pb-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Workload Distribution</p>
        <TooltipProvider>
          <div className="space-y-2.5">
            {stats.workload.map(tech => {
              const loadPercent = (tech.pending / maxPending) * 100;
              const isOverloaded = tech.pending >= 5;
              const isHigh = tech.pending >= 3;
              return (
                <Tooltip key={tech.id}>
                  <TooltipTrigger asChild>
                    <div className="group flex items-center gap-3 py-1 cursor-default">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-foreground">
                          {tech.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground truncate">{tech.name}</span>
                          <div className="flex items-center gap-1.5">
                            {isOverloaded && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Overloaded</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">{tech.pending} active · {tech.done} done</span>
                          </div>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isOverloaded ? 'bg-destructive' : isHigh ? 'bg-warning' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.max(loadPercent, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{tech.name}</p>
                    <p className="text-xs text-muted-foreground">{tech.specialization}</p>
                    <p className="text-xs">{tech.pending} pending · {tech.done} completed</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Overall progress bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Progress</span>
          <span className="text-xs font-bold text-foreground">{stats.completionRate}%</span>
        </div>
        <Progress value={stats.completionRate} className="h-2.5" />
      </div>
    </div>
  );
}
