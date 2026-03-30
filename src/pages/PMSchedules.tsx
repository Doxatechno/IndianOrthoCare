import { useState, useMemo } from 'react';
import { Search, Filter, LayoutGrid, List, CalendarDays } from 'lucide-react';
import { PMStatus } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkforcePanel from '@/components/pm/WorkforcePanel';
import PMKanbanBoard from '@/components/pm/PMKanbanBoard';
import PMListView from '@/components/pm/PMListView';

const allStatuses: PMStatus[] = ['Pending', 'Assigned', 'Completed'];

export default function PMSchedules() {
  const { pmSchedules: data, updatePMSchedule, technicians } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const filtered = useMemo(() => data.filter(p => {
    const matchSearch = p.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  }), [data, search, statusFilter]);

  const workloadMap = useMemo(() => {
    const map: Record<string, number> = {};
    const activeTechs = technicians.filter(t => t.isActive);
    activeTechs.forEach(tech => {
      map[tech.id] = data.filter(p => p.assignedTechnician === tech.name && p.status !== 'Completed').length;
    });
    return map;
  }, [technicians, data]);

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
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="page-header font-display flex items-center gap-2.5">
            <CalendarDays size={22} className="text-primary" />
            PM Schedules
          </h1>
          <p className="page-subheader">Preventive Maintenance planning & workforce allocation</p>
        </div>
      </div>

      {/* Workforce overview */}
      <WorkforcePanel technicians={technicians} pmSchedules={data} />

      {/* Filters + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search PM schedules..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-xl">
              <Filter size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={view} onValueChange={v => setView(v as 'kanban' | 'list')} className="shrink-0">
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
        <div className="glass-card p-12 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">No PM schedules found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
