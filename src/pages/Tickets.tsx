import { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { tickets as initialTickets, InstallationTicket, TicketStatus, equipment, customers, technicians } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';

const allStatuses: TicketStatus[] = ['Pending', 'Assigned', 'In Progress', 'Completed', 'Issue Reported'];

export default function Tickets() {
  const [data, setData] = useState<InstallationTicket[]>(initialTickets);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<InstallationTicket | null>(null);
  const [form, setForm] = useState({ equipmentId: '', location: '', remarks: '' });

  const filtered = data.filter(t => {
    const matchSearch = t.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAdd = () => {
    if (!form.equipmentId) return;
    const eq = equipment.find(e => e.id === form.equipmentId);
    const cust = customers.find(c => c.id === eq?.customerId);
    const ticket: InstallationTicket = {
      id: `TK-${String(data.length + 1).padStart(3, '0')}`,
      equipmentId: form.equipmentId,
      equipmentName: eq?.name || '',
      customerId: eq?.customerId || '',
      customerName: cust?.name || '',
      location: form.location,
      status: 'Pending',
      assignedTechnician: null,
      remarks: form.remarks,
      issueType: null,
      createdDate: new Date().toISOString().split('T')[0],
      completedDate: null,
    };
    setData([ticket, ...data]);
    setForm({ equipmentId: '', location: '', remarks: '' });
    setDialogOpen(false);
  };

  const assignTechnician = (ticketId: string, tech: string) => {
    setData(data.map(t => t.id === ticketId ? { ...t, assignedTechnician: tech, status: 'Assigned' as TicketStatus } : t));
    setDetailTicket(prev => prev && prev.id === ticketId ? { ...prev, assignedTechnician: tech, status: 'Assigned' } : prev);
  };

  const updateStatus = (ticketId: string, status: TicketStatus) => {
    setData(data.map(t => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        status,
        completedDate: status === 'Completed' ? new Date().toISOString().split('T')[0] : t.completedDate,
      };
    }));
    setDetailTicket(prev => prev && prev.id === ticketId ? { ...prev, status, completedDate: status === 'Completed' ? new Date().toISOString().split('T')[0] : prev.completedDate } : prev);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Installation Tickets</h1>
          <p className="page-subheader">Track installation progress</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Create Ticket</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New Installation Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-medium">Equipment</Label>
                <Select value={form.equipmentId} onValueChange={v => setForm({ ...form, equipmentId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.serialNumber})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Location</Label>
                <Input className="mt-1" placeholder="e.g. Radiology Dept, 2nd Floor" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-medium">Remarks</Label>
                <Textarea className="mt-1" placeholder="Any notes..." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
              <Button onClick={handleAdd} className="w-full mt-2">Create Ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><Filter size={14} className="mr-2" /><SelectValue /></SelectTrigger>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Technician</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setDetailTicket(t)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{t.equipmentName}</p>
                    <p className="text-xs text-muted-foreground">{t.id} · {t.location}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{t.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{t.assignedTechnician || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{t.createdDate}</td>
                  <td className="px-4 py-3 text-xs text-primary font-medium">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailTicket} onOpenChange={() => setDetailTicket(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detailTicket.id} — {detailTicket.equipmentName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground block">Customer</span>{detailTicket.customerName}</div>
                  <div><span className="text-xs text-muted-foreground block">Location</span>{detailTicket.location}</div>
                  <div><span className="text-xs text-muted-foreground block">Status</span><StatusBadge status={detailTicket.status} /></div>
                  <div><span className="text-xs text-muted-foreground block">Created</span>{detailTicket.createdDate}</div>
                  {detailTicket.completedDate && <div><span className="text-xs text-muted-foreground block">Completed</span>{detailTicket.completedDate}</div>}
                  {detailTicket.issueType && <div><span className="text-xs text-muted-foreground block">Issue</span>{detailTicket.issueType}</div>}
                </div>
                {detailTicket.remarks && <div className="text-sm"><span className="text-xs text-muted-foreground block mb-1">Remarks</span>{detailTicket.remarks}</div>}
                
                <div className="border-t border-border/50 pt-3 space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Assign Technician</Label>
                    <Select value={detailTicket.assignedTechnician || ''} onValueChange={v => assignTechnician(detailTicket.id, v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select technician" /></SelectTrigger>
                      <SelectContent>
                        {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Update Status</Label>
                    <Select value={detailTicket.status} onValueChange={v => updateStatus(detailTicket.id, v as TicketStatus)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
