import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, LayoutGrid, List, CalendarDays, Zap, UserPlus, Sparkles, Clock, CheckCircle2, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { PMStatus } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PMKanbanBoard from '@/components/pm/PMKanbanBoard';
import PMListView from '@/components/pm/PMListView';
import { toast } from '@/hooks/use-toast';

const allStatuses: PMStatus[] = ['Pending', 'Assigned', 'Completed'];

export default function PMSchedules() {
  const { pmSchedules: data, updatePMSchedule, technicians } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto');

  const activeTechs = useMemo(() => technicians.filter(t => t.isActive && (t.role === 'Service Engineer' || t.role === 'Sales and Service Engineer')), [technicians]);

  const filtered = useMemo(() => data.filter(p => {
    const matchSearch = p.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  }), [data, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const pending = data.filter(p => p.status === 'Pending').length;
    const assigned = data.filter(p => p.status === 'Assigned').length;
    const completed = data.filter(p => p.status === 'Completed').length;
    const total = data.length;
    const unassigned = data.filter(p => !p.assignedTechnician && p.status === 'Pending').length;
    const overdue = data.filter(p => new Date(p.plannedDate) < new Date() && p.status !== 'Completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { pending, assigned, completed, total, unassigned, overdue, completionRate };
  }, [data]);

  const workloadMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeTechs.forEach(tech => {
      map[tech.id] = data.filter(p => p.assignedTechnician === tech.name && p.status !== 'Completed').length;
    });
    return map;
  }, [activeTechs, data]);

  const assignTechnician = async (pmId: string, tech: string) => {
    try {
      await updatePMSchedule(pmId, { assignedTechnician: tech, status: 'Assigned' });
    } catch (error) {
      console.error('Failed to assign technician:', error);
    }
  };

  const updateStatus = async (pmId: string, status: PMStatus) => {
    try {
      await updatePMSchedule(pmId, { status });
    } catch (error) {
      console.error('Failed to update PM status:', error);
    }
  };

  // Auto-assign: round-robin by least workload
  const handleAutoAssign = useCallback(async () => {
    const unassigned = data.filter(p => !p.assignedTechnician && p.status === 'Pending');
    if (unassigned.length === 0) {
      toast({ title: 'No unassigned PMs', description: 'All PM schedules are already assigned.' });
      return;
    }
    if (activeTechs.length === 0) {
      toast({ title: 'No technicians', description: 'Add active technicians first.', variant: 'destructive' });
      return;
    }

    // Build workload tracker
    const load: Record<string, number> = {};
    activeTechs.forEach(t => {
      load[t.id] = data.filter(p => p.assignedTechnician === t.name && p.status !== 'Completed').length;
    });

    let assignedCount = 0;
    for (const pm of unassigned) {
      // Find tech with least load
      const sorted = activeTechs.slice().sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0));
      const tech = sorted[0];
      try {
        await updatePMSchedule(pm.id, { assignedTechnician: tech.name, status: 'Assigned' });
        load[tech.id] = (load[tech.id] ?? 0) + 1;
        assignedCount++;
      } catch (err) {
        console.error('Auto-assign failed for', pm.id, err);
      }
    }
    toast({ title: 'Auto-Assign Complete', description: `${assignedCount} PM tasks assigned to technicians.` });
    setAssignDialogOpen(false);
  }, [data, activeTechs, updatePMSchedule]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <CalendarDays size={20} className="text-primary-foreground" />
            </div>
            PM Schedules
          </h1>
          <p className="page-subheader ml-[52px]">Preventive Maintenance planning & workforce allocation</p>
        </div>
        <Button
          onClick={() => setAssignDialogOpen(true)}
          className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          disabled={stats.unassigned === 0}
        >
          <Sparkles size={16} /> Assign Tasks
          {stats.unassigned > 0 && (
            <Badge className="ml-1 bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0 h-5">
              {stats.unassigned}
            </Badge>
          )}
        </Button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total PMs', value: stats.total, icon: CalendarDays, gradient: 'from-primary/15 to-primary/5', iconColor: 'text-primary', borderColor: 'border-primary/20' },
          { label: 'Pending', value: stats.pending, icon: Clock, gradient: 'from-warning/15 to-warning/5', iconColor: 'text-warning', borderColor: 'border-warning/20' },
          { label: 'Assigned', value: stats.assigned, icon: Users, gradient: 'from-info/15 to-info/5', iconColor: 'text-info', borderColor: 'border-info/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, gradient: 'from-success/15 to-success/5', iconColor: 'text-success', borderColor: 'border-success/20' },
          { label: 'Unassigned', value: stats.unassigned, icon: AlertTriangle, gradient: 'from-destructive/15 to-destructive/5', iconColor: 'text-destructive', borderColor: 'border-destructive/20' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, gradient: 'from-destructive/15 to-destructive/5', iconColor: 'text-destructive', borderColor: 'border-destructive/20' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border ${stat.borderColor} bg-gradient-to-br ${stat.gradient} p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}>
            <stat.icon size={18} className={`mx-auto mb-2 ${stat.iconColor}`} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Completion Progress */}
      {stats.total > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <span className="text-sm font-bold text-foreground">Overall Completion</span>
            </div>
            <span className="text-sm font-bold text-foreground">{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-3" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">{stats.completed} of {stats.total} completed</span>
            <span className="text-[10px] text-muted-foreground">{activeTechs.length} active technicians</span>
          </div>
        </div>
      )}

      {/* Technician Workload (compact) */}
      {activeTechs.length > 0 && stats.total > 0 && (
        <div className="glass-card p-4">
          <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
            <Users size={14} className="text-primary" />
            Technician Workload
          </p>
          <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {activeTechs.map(tech => {
                const pending = workloadMap[tech.id] ?? 0;
                const done = data.filter(p => p.assignedTechnician === tech.name && p.status === 'Completed').length;
                const isOverloaded = pending >= 5;
                const isHigh = pending >= 3;
                return (
                  <Tooltip key={tech.id}>
                    <TooltipTrigger asChild>
                      <div className={`rounded-xl border p-3 text-center transition-all hover:-translate-y-0.5 cursor-default ${
                        isOverloaded ? 'border-destructive/30 bg-destructive/5' : isHigh ? 'border-warning/30 bg-warning/5' : 'border-border bg-card/50'
                      }`}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-1.5">
                          <span className="text-[10px] font-bold text-primary">
                            {tech.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-foreground truncate">{tech.name.split(' ')[0]}</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span className={`text-[10px] font-bold ${isOverloaded ? 'text-destructive' : isHigh ? 'text-warning' : 'text-primary'}`}>{pending}</span>
                          <span className="text-[10px] text-muted-foreground">active</span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-success font-bold">{done}</span>
                          <span className="text-[10px] text-muted-foreground">done</span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{tech.name}</p>
                      <p className="text-xs text-muted-foreground">{tech.specialization}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Filters + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
          <div className="relative sm:max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search PM schedules..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl">
              <Filter size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={view} onValueChange={v => setView(v as 'kanban' | 'list')} className="shrink-0 self-start sm:self-auto">
          <TabsList className="h-9">
            <TabsTrigger value="kanban" className="text-xs gap-1.5 px-3">
              <LayoutGrid size={14} /> Board
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs gap-1.5 px-3">
              <List size={14} /> List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <PMKanbanBoard
          pmSchedules={filtered}
          technicians={technicians}
          onAssign={assignTechnician}
          onStatusChange={updateStatus}
          workloadMap={workloadMap}
        />
      ) : (
        <PMListView
          pmSchedules={filtered}
          technicians={technicians}
          onAssign={assignTechnician}
          onStatusChange={updateStatus}
          workloadMap={workloadMap}
        />
      )}

      {filtered.length === 0 && (
        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm font-bold text-foreground">No PM schedules found</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
            PM schedules are automatically created when an AMC contract reaches "Payment Received" status.
          </p>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              Assign PM Tasks
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">
              {stats.unassigned} unassigned PM {stats.unassigned === 1 ? 'task' : 'tasks'} available
            </p>

            <RadioGroup value={assignMode} onValueChange={v => setAssignMode(v as 'auto' | 'manual')} className="space-y-3">
              <div className={`flex items-start gap-3 rounded-xl border p-4 transition-all cursor-pointer ${
                assignMode === 'auto' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
              }`} onClick={() => setAssignMode('auto')}>
                <RadioGroupItem value="auto" id="auto" className="mt-0.5" />
                <Label htmlFor="auto" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-primary" />
                    <span className="text-sm font-bold">Auto Assign</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Automatically distribute tasks evenly across technicians based on current workload (round-robin by least load).
                  </p>
                </Label>
              </div>

              <div className={`flex items-start gap-3 rounded-xl border p-4 transition-all cursor-pointer ${
                assignMode === 'manual' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
              }`} onClick={() => setAssignMode('manual')}>
                <RadioGroupItem value="manual" id="manual" className="mt-0.5" />
                <Label htmlFor="manual" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus size={14} className="text-primary" />
                    <span className="text-sm font-bold">Manual Assign</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Assign technicians manually to each PM task from the board or list view.
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {assignMode === 'auto' && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] text-muted-foreground mb-2 font-semibold">Current Workload Preview</p>
                <div className="space-y-1.5">
                  {activeTechs.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground">{t.name}</span>
                      <span className="text-muted-foreground">{workloadMap[t.id] ?? 0} active tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {assignMode === 'auto' ? (
                <Button onClick={handleAutoAssign} className="flex-1 rounded-xl h-11 gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                  <Zap size={14} /> Auto Assign All
                </Button>
              ) : (
                <Button onClick={() => setAssignDialogOpen(false)} className="flex-1 rounded-xl h-11 gap-2">
                  <UserPlus size={14} /> Go to Board View
                </Button>
              )}
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
