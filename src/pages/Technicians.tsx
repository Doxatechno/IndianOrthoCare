import { useState } from 'react';
import { Search, Plus, Wrench, Phone, Mail, UserCheck, UserX } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Technicians() {
  const { technicians, addTechnician, updateTechnician } = useData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', specialization: '' });
  const [editForm, setEditForm] = useState({ id: '', name: '', phone: '', email: '', specialization: '', isActive: true });

  const filtered = technicians.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.specialization.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.name) return;
    try {
      await addTechnician(form);
      setForm({ name: '', phone: '', email: '', specialization: '' });
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to add technician:', error);
    }
  };

  const handleEdit = async () => {
    try {
      await updateTechnician(editForm.id, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        specialization: editForm.specialization,
        isActive: editForm.isActive,
      });
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update technician:', error);
    }
  };

  const openEdit = (t: typeof editForm) => {
    setEditForm(t);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display">Technicians</h1>
          <p className="page-subheader">Manage your service technicians</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">
              <Plus size={16} /> Add Technician
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">New Technician</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Name</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Phone</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="+91 ..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Specialization</Label>
                <Input className="mt-1.5 rounded-xl" placeholder="e.g. Radiology Equipment" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <Button onClick={handleAdd} className="w-full mt-3 rounded-xl h-11 font-semibold">Add Technician</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search technicians..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/40">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Technician</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Specialization</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wrench size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">{t.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1"><Phone size={11} /> {t.phone}</span>
                      <span className="flex items-center gap-1"><Mail size={11} /> {t.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{t.specialization}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${t.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {t.isActive ? <><UserCheck size={11} /> Active</> : <><UserX size={11} /> Inactive</>}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => openEdit(t)} className="text-xs text-primary font-semibold hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((t, i) => (
          <div
            key={t.id}
            className="glass-card p-4 animate-fade-in cursor-pointer active:scale-[0.98] transition-all"
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => openEdit(t)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wrench size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.specialization}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                {t.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
              <span className="flex items-center gap-1"><Phone size={10} /> {t.phone}</span>
              <span className="flex items-center gap-1"><Mail size={10} /> {t.email}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Edit Technician</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Name</Label>
              <Input className="mt-1.5 rounded-xl" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Phone</Label>
              <Input className="mt-1.5 rounded-xl" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
              <Input className="mt-1.5 rounded-xl" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Specialization</Label>
              <Input className="mt-1.5 rounded-xl" value={editForm.specialization} onChange={e => setEditForm({ ...editForm, specialization: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs font-semibold text-muted-foreground">Active</Label>
              <button
                onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                className={`w-10 h-5 rounded-full transition-colors ${editForm.isActive ? 'bg-primary' : 'bg-muted'} relative`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.isActive ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            <Button onClick={handleEdit} className="w-full mt-3 rounded-xl h-11 font-semibold">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
