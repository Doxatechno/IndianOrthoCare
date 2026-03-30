import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Customer } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  customers: Customer[];
  onAdd: (form: { name: string; modelNumber: string; serialNumber: string; customerId: string }) => Promise<void>;
}

export default function EquipmentAddDialog({ customers, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', modelNumber: '', serialNumber: '', customerId: '' });

  const handleAdd = async () => {
    if (!form.name || !form.customerId) return;
    try {
      await onAdd(form);
      setForm({ name: '', modelNumber: '', serialNumber: '', customerId: '' });
      setOpen(false);
    } catch (error) {
      console.error('Failed to add equipment:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">
          <Plus size={16} /> Add Equipment
        </Button>
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
  );
}
