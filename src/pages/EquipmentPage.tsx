import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { equipment as initialEquipment, Equipment, customers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';

export default function EquipmentPage() {
  const [data, setData] = useState<Equipment[]>(initialEquipment);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', modelNumber: '', serialNumber: '', customerId: '' });

  const filtered = data.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
    e.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name || !form.customerId) return;
    const customer = customers.find(c => c.id === form.customerId);
    const newEquipment: Equipment = {
      id: `E${String(data.length + 1).padStart(3, '0')}`,
      name: form.name,
      modelNumber: form.modelNumber,
      serialNumber: form.serialNumber,
      customerId: form.customerId,
      customerName: customer?.name || '',
      installationDate: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
    };
    setData([newEquipment, ...data]);
    setForm({ name: '', modelNumber: '', serialNumber: '', customerId: '' });
    setDialogOpen(false);
  };

  const getWarrantyStatus = (e: Equipment) => {
    if (!e.warrantyEndDate) return null;
    const end = new Date(e.warrantyEndDate);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= 30) return 'Expiring Soon';
    return 'Active';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Equipment</h1>
          <p className="page-subheader">Manage medical equipment inventory</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Add Equipment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New Equipment</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-medium">Equipment Name</Label>
                <Input className="mt-1" placeholder="e.g. X-Ray Machine" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-medium">Model Number</Label>
                <Input className="mt-1" placeholder="e.g. XR-5000" value={form.modelNumber} onChange={e => setForm({ ...form, modelNumber: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-medium">Serial Number</Label>
                <Input className="mt-1" placeholder="e.g. SN-XR-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-medium">Customer</Label>
                <Select value={form.customerId} onValueChange={v => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full mt-2">Add Equipment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, serial, customer..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Model</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Serial No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Installed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Warranty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(e => {
                const ws = getWarrantyStatus(e);
                return (
                  <tr key={e.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{e.modelNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{e.modelNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{e.serialNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{e.installationDate || '—'}</td>
                    <td className="px-4 py-3">
                      {ws ? <StatusBadge status={ws === 'Expired' ? 'Issue Reported' : ws === 'Expiring Soon' ? 'Pending' : 'Active'} /> : <span className="text-xs text-muted-foreground">N/A</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
