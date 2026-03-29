import { useState } from 'react';
import { Plus, Search, Phone, Mail, MapPin } from 'lucide-react';
import { customers as initialCustomers, Customer } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Customers() {
  const [data, setData] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });

  const filtered = data.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name) return;
    const newCustomer: Customer = {
      id: `C${String(data.length + 1).padStart(3, '0')}`,
      ...form,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setData([newCustomer, ...data]);
    setForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Customers</h1>
          <p className="page-subheader">Manage hospitals and labs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              {[
                { key: 'name', label: 'Customer Name', placeholder: 'e.g. City General Hospital' },
                { key: 'contactPerson', label: 'Contact Person', placeholder: 'Dr. Name' },
                { key: 'phone', label: 'Phone', placeholder: '+91 XXXXX XXXXX' },
                { key: 'email', label: 'Email', placeholder: 'admin@hospital.com' },
                { key: 'address', label: 'Address', placeholder: 'Full address' },
              ].map(field => (
                <div key={field.key}>
                  <Label className="text-xs font-medium">{field.label}</Label>
                  <Input
                    className="mt-1"
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  />
                </div>
              ))}
              <Button onClick={handleAdd} className="w-full mt-2">Create Customer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search customers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-card rounded-xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{c.contactPerson}</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{c.id}</span>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Phone size={12} /> {c.phone}</div>
              <div className="flex items-center gap-2"><Mail size={12} /> {c.email}</div>
              <div className="flex items-center gap-2"><MapPin size={12} /> {c.address}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
