import { useState } from 'react';
import { Search, Filter, CalendarCheck } from 'lucide-react';
import { PMStatus } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';

const allStatuses: PMStatus[] = ['Pending', 'Assigned', 'Completed'];

export default function PMSchedules() {
  const { pmSchedules: data, updatePMSchedule } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = data.filter(p => {
    const matchSearch = p.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
        <p className="page-subheader">Preventive Maintenance visits</p>
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
                <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
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
                      <SelectTrigger className="h-8 text-xs w-32 rounded-lg"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent>
                        {technicians.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
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
          <div key={p.id} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
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
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Assign tech" /></SelectTrigger>
                <SelectContent>
                  {technicians.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
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
