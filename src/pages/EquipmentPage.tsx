import { useState } from 'react';
import { Search, Plus, Cpu } from 'lucide-react';
import { Equipment } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';

export default function EquipmentPage() {
  const { customers, equipment, setEquipment } = useData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', modelNumber: '', serialNumber: '', customerId: '' });

  const filtered = equipment.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
    e.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name || !form.customerId) return;
    const customer = customers.find(c => c.id === form.customerId);
    const newEquipment: Equipment = {
      id: `E${String(equipment.length + 1).padStart(3, '0')}`,
      name: form.name,
      modelNumber: form.modelNumber,
      serialNumber: form.serialNumber,
      customerId: form.customerId,
      customerName: customer?.name || '',
      installationDate: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
    };
    setEquipment(prev => [newEquipment, ...prev]);
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
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display">Equipment</h1>
          <p className="page-subheader">Manage medical equipment inventory</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"><Plus size={16} /> Add Equipment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">New Equipment</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Equipment Name</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="e.g. X-Ray Machine" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Model Number</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="e.g. XR-5000" value={form.modelNumber} onChange={e => setForm({ ...form, modelNumber: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Serial Number</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="e.g. SN-XR-2024-001" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Customer</Label>
                <Select value={form.customerId} onValueChange={v => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full mt-3 rounded-xl h-11 font-semibold">Add Equipment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, serial, customer..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/40">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Equipment</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Model</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Serial No.</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Installed</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Warranty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(e => {
                const ws = getWarrantyStatus(e);
                return (
                  <tr key={e.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-foreground">{e.name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{e.modelNumber}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground hidden lg:table-cell">{e.serialNumber}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{e.customerName}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-[12px]">{e.installationDate || '—'}</td>
                    <td className="px-5 py-3.5">
                      {ws ? <StatusBadge status={ws === 'Expired' ? 'Issue Reported' : ws === 'Expiring Soon' ? 'Pending' : 'Active'} /> : <span className="text-[11px] text-muted-foreground">N/A</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filtered.map((e, i) => {
          const ws = getWarrantyStatus(e);
          return (
            <div key={e.id} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Cpu size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground">{e.modelNumber} · {e.serialNumber}</p>
                  </div>
                </div>
                {ws ? <StatusBadge status={ws === 'Expired' ? 'Issue Reported' : ws === 'Expiring Soon' ? 'Pending' : 'Active'} /> : <span className="text-[10px] text-muted-foreground">N/A</span>}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                <span>{e.customerName}</span>
                <span>{e.installationDate || 'Not installed'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
