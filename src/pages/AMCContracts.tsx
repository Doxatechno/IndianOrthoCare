import { useState } from 'react';
import { Search, Plus, IndianRupee } from 'lucide-react';
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">AMC Contracts</h1>
          <p className="page-subheader">Annual Maintenance Contracts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Create AMC</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New AMC Contract</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-medium">Equipment</Label>
                <Select value={form.equipmentId} onValueChange={v => setForm({ ...form, equipmentId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    {equipment.filter(e => e.installationDate).map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.customerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Start Date</Label>
                  <Input type="date" className="mt-1" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs font-medium">End Date</Label>
                  <Input type="date" className="mt-1" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Price (₹)</Label>
                <Input type="number" className="mt-1" placeholder="e.g. 50000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <Button onClick={handleAdd} className="w-full mt-2">Create AMC</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search AMC contracts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Period</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{a.equipmentName}</p>
                    <p className="text-xs text-muted-foreground">{a.id}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.customerName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{a.startDate} → {a.endDate}</td>
                  <td className="px-4 py-3 font-medium text-foreground flex items-center gap-0.5"><IndianRupee size={12} />{a.price.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <Select value={a.status} onValueChange={v => updateStatus(a.id, v as AMCStatus)}>
                      <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
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
