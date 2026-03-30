import { useState } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Building2 } from 'lucide-react';
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
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display">Customers</h1>
          <p className="page-subheader">Manage hospitals and labs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"><Plus size={16} /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">New Customer</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              {[
                { key: 'name', label: 'Customer Name', placeholder: 'e.g. City General Hospital' },
                { key: 'contactPerson', label: 'Contact Person', placeholder: 'Dr. Name' },
                { key: 'phone', label: 'Phone', placeholder: '+91 XXXXX XXXXX' },
                { key: 'email', label: 'Email', placeholder: 'admin@hospital.com' },
                { key: 'address', label: 'Address', placeholder: 'Full address' },
              ].map(field => (
                <div key={field.key}>
                  <Label className="text-xs font-semibold text-muted-foreground">{field.label}</Label>
                  <Input
                    className="mt-1.5 rounded-xl"
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  />
                </div>
              ))}
              <Button onClick={handleAdd} className="w-full mt-3 rounded-xl h-11 font-semibold">Create Customer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search customers..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c, i) => (
          <div 
            key={c.id} 
            className="glass-card p-5 hover:-translate-y-1 transition-all duration-300 opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground font-display">{c.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.contactPerson}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{c.id}</span>
            </div>
            <div className="space-y-2 text-[12px] text-muted-foreground">
              <div className="flex items-center gap-2.5"><Phone size={13} className="text-primary/60 shrink-0" /> <span className="truncate">{c.phone}</span></div>
              <div className="flex items-center gap-2.5"><Mail size={13} className="text-primary/60 shrink-0" /> <span className="truncate">{c.email}</span></div>
              <div className="flex items-start gap-2.5"><MapPin size={13} className="text-primary/60 mt-0.5 shrink-0" /> <span className="line-clamp-2">{c.address}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
