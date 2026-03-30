import { useMemo, useState } from 'react';
import { Search, Plus, Filter, ClipboardList } from 'lucide-react';
import { InstallationTicket, TicketStatus, technicians } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';

const allStatuses: TicketStatus[] = ['Pending', 'Assigned', 'In Progress', 'Completed', 'Issue Reported'];

export default function Tickets() {
  const { tickets: data, equipment, addTicket, updateTicket } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({ equipmentId: '', location: '', remarks: '' });

  const filtered = data.filter(t => {
    const matchSearch = t.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const detailTicket = useMemo(
    () => data.find(ticket => ticket.id === detailTicketId) ?? null,
    [data, detailTicketId],
  );

  const handleAdd = async () => {
    if (!form.equipmentId) return;
    try {
      await addTicket(form);
      setForm({ equipmentId: '', location: '', remarks: '' });
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const assignTechnician = async (ticketId: string, tech: string) => {
    try {
      await updateTicket(ticketId, { assignedTechnician: tech, status: 'Assigned' });
    } catch (error) {
      console.error('Failed to assign technician:', error);
    }
  };

  const updateStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      await updateTicket(ticketId, { status });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display">Installation Tickets</h1>
          <p className="page-subheader">Track installation progress</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"><Plus size={16} /> Create Ticket</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">New Installation Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Equipment</Label>
                <Select value={form.equipmentId} onValueChange={v => setForm({ ...form, equipmentId: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.serialNumber})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Location</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="e.g. Radiology Dept, 2nd Floor" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Remarks</Label>
                <Textarea className="mt-1.5 rounded-xl" placeholder="Any notes..." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
              <Button onClick={handleAdd} className="w-full mt-3 rounded-xl h-11 font-semibold">Create Ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 rounded-xl"><Filter size={14} className="mr-2" /><SelectValue /></SelectTrigger>
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
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ticket</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Technician</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setDetailTicketId(t.id)}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{t.equipmentName}</p>
                    <p className="text-[11px] text-muted-foreground">{t.id} · {t.location}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{t.customerName}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{t.assignedTechnician || '—'}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-3.5 text-muted-foreground text-[12px]">{t.createdDate}</td>
                  <td className="px-5 py-3.5 text-xs text-primary font-semibold">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((t, i) => (
          <div
            key={t.id}
            className="glass-card p-4 active:scale-[0.98] transition-all cursor-pointer animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => setDetailTicketId(t.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.equipmentName}</p>
                  <p className="text-[11px] text-muted-foreground">{t.id}</p>
                </div>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
              <span>{t.customerName}</span>
              <span>{t.assignedTechnician || 'Unassigned'}</span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!detailTicket} onOpenChange={() => setDetailTicketId(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          {detailTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 font-display">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList size={14} className="text-primary" />
                  </div>
                  {detailTicket.id} — {detailTicket.equipmentName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-secondary/50 rounded-xl p-3"><span className="text-[11px] text-muted-foreground block font-medium">Customer</span><span className="font-semibold text-foreground">{detailTicket.customerName}</span></div>
                  <div className="bg-secondary/50 rounded-xl p-3"><span className="text-[11px] text-muted-foreground block font-medium">Location</span><span className="font-semibold text-foreground">{detailTicket.location}</span></div>
                  <div className="bg-secondary/50 rounded-xl p-3"><span className="text-[11px] text-muted-foreground block font-medium">Status</span><div className="mt-1"><StatusBadge status={detailTicket.status} /></div></div>
                  <div className="bg-secondary/50 rounded-xl p-3"><span className="text-[11px] text-muted-foreground block font-medium">Created</span><span className="font-semibold text-foreground">{detailTicket.createdDate}</span></div>
                  {detailTicket.completedDate && <div className="bg-secondary/50 rounded-xl p-3"><span className="text-[11px] text-muted-foreground block font-medium">Completed</span><span className="font-semibold text-foreground">{detailTicket.completedDate}</span></div>}
                  {detailTicket.issueType && <div className="bg-secondary/50 rounded-xl p-3"><span className="text-[11px] text-muted-foreground block font-medium">Issue</span><span className="font-semibold text-foreground">{detailTicket.issueType}</span></div>}
                </div>
                {detailTicket.remarks && <div className="bg-secondary/50 rounded-xl p-3 text-sm"><span className="text-[11px] text-muted-foreground block font-medium mb-1">Remarks</span><span className="text-foreground">{detailTicket.remarks}</span></div>}

                <div className="border-t border-border/50 pt-4 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Assign Technician</Label>
                    <Select value={detailTicket.assignedTechnician || ''} onValueChange={v => assignTechnician(detailTicket.id, v)}>
                      <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select technician" /></SelectTrigger>
                      <SelectContent>
                        {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Update Status</Label>
                    <Select value={detailTicket.status} onValueChange={v => updateStatus(detailTicket.id, v as TicketStatus)}>
                      <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
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
