import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { pmSchedules as initialPM, PMSchedule, PMStatus, technicians } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';

const allStatuses: PMStatus[] = ['Pending', 'Assigned', 'Completed'];

export default function PMSchedules() {
  const [data, setData] = useState<PMSchedule[]>(initialPM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = data.filter(p => {
    const matchSearch = p.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const assignTechnician = (pmId: string, tech: string) => {
    setData(data.map(p => p.id === pmId ? { ...p, assignedTechnician: tech, status: 'Assigned' as PMStatus } : p));
  };

  const updateStatus = (pmId: string, status: PMStatus) => {
    setData(data.map(p => p.id === pmId ? { ...p, status } : p));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-header">PM Schedules</h1>
        <p className="page-subheader">Preventive Maintenance visits</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search PM schedules..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><Filter size={14} className="mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">PM</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Planned Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technician</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">PM{p.pmNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{p.equipmentName}</p>
                    <p className="text-xs text-muted-foreground">{p.id}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.plannedDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <Select value={p.assignedTechnician || ''} onValueChange={v => assignTechnician(p.id, v)}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent>
                        {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={p.status} onValueChange={v => updateStatus(p.id, v as PMStatus)}>
                      <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
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
    </div>
  );
}
