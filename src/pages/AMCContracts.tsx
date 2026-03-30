import { useState } from 'react';
import { Search, Plus, IndianRupee, Shield } from 'lucide-react';
import { amcContracts as initialAMC, AMCContract, AMCStatus, equipment, customers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';

const allStatuses: AMCStatus[] = ['Quotation Sent', 'Approved', 'Payment Pending', 'Paid', 'Active'];

export default function AMCContracts() {
  const [data, setData] = useState<AMCContract[]>(initialAMC);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ equipmentId: '', startDate: '', endDate: '', price: '' });

  const filtered = data.filter(a =>
    a.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
    a.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.equipmentId) return;
    const eq = equipment.find(e => e.id === form.equipmentId);
    const cust = customers.find(c => c.id === eq?.customerId);
    const amc: AMCContract = {
      id: `AMC-${String(data.length + 1).padStart(3, '0')}`,
      equipmentId: form.equipmentId,
      equipmentName: eq?.name || '',
      customerId: eq?.customerId || '',
      customerName: cust?.name || '',
      startDate: form.startDate,
      endDate: form.endDate,
      price: Number(form.price) || 0,
      status: 'Quotation Sent',
    };
    setData([amc, ...data]);
    setForm({ equipmentId: '', startDate: '', endDate: '', price: '' });
    setDialogOpen(false);
  };

  const updateStatus = (amcId: string, status: AMCStatus) => {
    setData(data.map(a => a.id === amcId ? { ...a, status } : a));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display">AMC Contracts</h1>
          <p className="page-subheader">Annual Maintenance Contracts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"><Plus size={16} /> Create AMC</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">New AMC Contract</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Equipment</Label>
                <Select value={form.equipmentId} onValueChange={v => setForm({ ...form, equipmentId: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    {equipment.filter(e => e.installationDate).map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.customerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Start Date</Label>
                  <Input type="date" className="mt-1.5 rounded-xl" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">End Date</Label>
                  <Input type="date" className="mt-1.5 rounded-xl" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Price (₹)</Label>
                <Input type="number" className="mt-1.5 rounded-xl" placeholder="e.g. 50000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <Button onClick={handleAdd} className="w-full mt-3 rounded-xl h-11 font-semibold">Create AMC</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search AMC contracts..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/40">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Equipment</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Period</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{a.equipmentName}</p>
                    <p className="text-[11px] text-muted-foreground">{a.id}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{a.customerName}</td>
                  <td className="px-5 py-3.5 text-[12px] text-muted-foreground hidden lg:table-cell">{a.startDate} → {a.endDate}</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground flex items-center gap-0.5"><IndianRupee size={12} />{a.price.toLocaleString()}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-3.5">
                    <Select value={a.status} onValueChange={v => updateStatus(a.id, v as AMCStatus)}>
                      <SelectTrigger className="h-8 text-xs w-36 rounded-lg"><SelectValue /></SelectTrigger>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filtered.map((a, i) => (
          <div key={a.id} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Shield size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{a.equipmentName}</p>
                  <p className="text-[11px] text-muted-foreground">{a.customerName} · {a.id}</p>
                </div>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <div className="flex items-center justify-between text-[12px] mb-3">
              <span className="font-semibold text-foreground flex items-center gap-0.5"><IndianRupee size={11} />{a.price.toLocaleString()}</span>
              <span className="text-muted-foreground">{a.startDate} → {a.endDate}</span>
            </div>
            <Select value={a.status} onValueChange={v => updateStatus(a.id, v as AMCStatus)}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
