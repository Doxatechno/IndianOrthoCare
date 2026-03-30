import { useState, useMemo } from 'react';
import { Search, Filter, CalendarCheck, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { PMStatus } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';

const allStatuses: PMStatus[] = ['Pending', 'Assigned', 'Completed'];

export default function PMSchedules() {
  const { pmSchedules: data, updatePMSchedule, technicians } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showWorkforce, setShowWorkforce] = useState(true);

  const filtered = data.filter(p => {
    const matchSearch = p.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Workforce allocation summary
  const workloadSummary = useMemo(() => {
    const activeTechs = technicians.filter(t => t.isActive);
    return activeTechs.map(tech => {
      const assigned = data.filter(p => p.assignedTechnician === tech.name && p.status !== 'Completed');
      const completed = data.filter(p => p.assignedTechnician === tech.name && p.status === 'Completed');
      return {
        id: tech.id,
        name: tech.name,
        specialization: tech.specialization,
        pendingCount: assigned.length,
        completedCount: completed.length,
        totalCount: assigned.length + completed.length,
      };
    }).sort((a, b) => a.pendingCount - b.pendingCount);
  }, [technicians, data]);

  const unassignedCount = data.filter(p => !p.assignedTechnician && p.status === 'Pending').length;

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

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-header font-display">PM Schedules</h1>
        <p className="page-subheader">Preventive Maintenance planning & workforce allocation</p>
      </div>

      {/* Workforce Allocation Panel */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowWorkforce(!showWorkforce)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users size={14} className="text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground font-display">Workforce Allocation</h3>
              <p className="text-[11px] text-muted-foreground">
                {unassignedCount} unassigned · {data.filter(p => p.status !== 'Completed').length} pending total
              </p>
            </div>
          </div>
          {showWorkforce ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        {showWorkforce && (
          <div className="px-4 pb-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-3 text-center">
                <p className="text-lg font-bold text-amber-700">{unassignedCount}</p>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Unassigned</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200/50 p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{data.filter(p => p.status === 'Assigned').length}</p>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Assigned</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200/50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{data.filter(p => p.status === 'Completed').length}</p>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
              </div>
              <div className="rounded-xl bg-purple-50 border border-purple-200/50 p-3 text-center">
                <p className="text-lg font-bold text-purple-700">{workloadSummary.length}</p>
                <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Technicians</p>
              </div>
            </div>

            {/* Technician workload bars */}
            <div className="space-y-2">
              {workloadSummary.map(tech => {
                const maxLoad = Math.max(...workloadSummary.map(t => t.pendingCount), 1);
                const loadPercent = (tech.pendingCount / maxLoad) * 100;
                const isOverloaded = tech.pendingCount >= 5;
                return (
                  <div key={tech.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-28 min-w-0 shrink-0">
                      <p className="text-xs font-semibold text-foreground truncate">{tech.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{tech.specialization}</p>
                    </div>
                    <div className="flex-1 bg-secondary/60 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 flex items-center px-2 ${
                          isOverloaded ? 'bg-destructive/70' : tech.pendingCount > 3 ? 'bg-amber-400' : 'bg-primary/60'
                        }`}
                        style={{ width: `${Math.max(loadPercent, 8)}%` }}
                      >
                        <span className="text-[9px] font-bold text-white whitespace-nowrap">{tech.pendingCount} pending</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 w-16 text-right">{tech.completedCount} done</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search PM schedules..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl"><Filter size={14} className="mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

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
              {filtered.map(p => (
                <tr key={p.id} className={`hover:bg-secondary/30 transition-colors ${!p.assignedTechnician && p.status === 'Pending' ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-5 py-3.5 font-bold text-foreground font-display">PM{p.pmNumber}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{p.equipmentName}</p>
                    <p className="text-[11px] text-muted-foreground">{p.id}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{p.customerName}</td>
                  <td className="px-5 py-3.5 text-muted-foreground text-[12px]">{p.plannedDate}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3.5">
                    <Select value={p.assignedTechnician || ''} onValueChange={v => assignTechnician(p.id, v)}>
                      <SelectTrigger className={`h-8 text-xs w-32 rounded-lg ${!p.assignedTechnician ? 'border-amber-300 bg-amber-50' : ''}`}>
                        <SelectValue placeholder="⚠ Assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.filter(t => t.isActive).map(t => {
                          const load = workloadSummary.find(w => w.id === t.id);
                          return (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name} {load ? `(${load.pendingCount} pending)` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-5 py-3.5">
                    <Select value={p.status} onValueChange={v => updateStatus(p.id, v as PMStatus)}>
                      <SelectTrigger className="h-8 text-xs w-28 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((p, i) => (
          <div key={p.id} className={`glass-card p-4 animate-fade-in ${!p.assignedTechnician && p.status === 'Pending' ? 'ring-1 ring-amber-300' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
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
            <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
              <CalendarCheck size={12} className="text-primary/60" />
              Planned: {p.plannedDate}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={p.assignedTechnician || ''} onValueChange={v => assignTechnician(p.id, v)}>
                <SelectTrigger className={`h-9 text-xs rounded-xl ${!p.assignedTechnician ? 'border-amber-300 bg-amber-50' : ''}`}>
                  <SelectValue placeholder="⚠ Assign tech" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.filter(t => t.isActive).map(t => {
                    const load = workloadSummary.find(w => w.id === t.id);
                    return (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name} ({load?.pendingCount ?? 0})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={p.status} onValueChange={v => updateStatus(p.id, v as PMStatus)}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
