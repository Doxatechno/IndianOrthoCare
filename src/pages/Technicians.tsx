import { useState } from 'react';
import { Search, Plus, Wrench, Phone, Mail, UserCheck, UserX, KeyRound, Crown, Headset, Briefcase } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { TechnicianRole } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ROLE_CONFIG: Record<TechnicianRole, { icon: typeof Crown; color: string; bg: string }> = {
  'Service Head': { icon: Crown, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  'Service Coordinator': { icon: Headset, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  'Service Engineer': { icon: Wrench, color: 'text-primary', bg: 'bg-primary/10' },
  'Sales and Service Engineer': { icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
};

export default function Technicians() {
  const { technicians, addTechnician, updateTechnician } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', specialization: '' });
  const [editForm, setEditForm] = useState({ id: '', name: '', phone: '', email: '', specialization: '', isActive: true });
  const [credForm, setCredForm] = useState({ techId: '', techName: '', email: '', password: '' });
  const [credLoading, setCredLoading] = useState(false);

  const filtered = technicians.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialization.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || t.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Resolve reporting manager: if it's a TECH-xxx ID, show "Name (ID)"
  const resolveManager = (manager: string) => {
    if (!manager) return '—';
    if (manager.startsWith('TECH-')) {
      const found = technicians.find(t => t.id === manager);
      return found ? `${found.name} (${found.employeeCode})` : manager;
    }
    return manager;
  };

  // Group by role for summary
  const roleCounts = technicians.reduce((acc, t) => {
    acc[t.role] = (acc[t.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

  const openCredentials = (t: { id: string; name: string; email: string }) => {
    setCredForm({ techId: t.id, techName: t.name, email: t.email, password: '' });
    setCredDialogOpen(true);
  };

  const handleCreateLogin = async () => {
    if (!credForm.email || !credForm.password) {
      toast.error('Email and password are required');
      return;
    }
    if (credForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCredLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-technician-user', {
        body: {
          email: credForm.email,
          password: credForm.password,
          technicianId: credForm.techId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Login created for ${credForm.techName}`);
      setCredDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create login');
    } finally {
      setCredLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display">Service Team</h1>
          <p className="page-subheader">Manage service engineers, coordinators & leadership</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">
              <Plus size={16} /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">New Team Member</DialogTitle></DialogHeader>
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
                <Input className="mt-1.5 rounded-xl" placeholder="e.g. Endoscopy Equipment" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <Button onClick={handleAdd} className="w-full mt-3 rounded-xl h-11 font-semibold">Add Member</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.entries(ROLE_CONFIG) as [TechnicianRole, typeof ROLE_CONFIG[TechnicianRole]][]).map(([role, config]) => {
          const Icon = config.icon;
          const count = roleCounts[role] || 0;
          return (
            <div
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`rounded-2xl border border-border/60 bg-card p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${roleFilter === role ? 'ring-2 ring-primary/40 shadow-md' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center`}>
                  <Icon size={14} className={config.color} />
                </div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground">{role}</p>
            </div>
          );
        })}
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, code..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-10 rounded-xl text-xs w-auto min-w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Service Head">Service Head</SelectItem>
            <SelectItem value="Service Coordinator">Service Coordinator</SelectItem>
            <SelectItem value="Service Engineer">Service Engineer</SelectItem>
            <SelectItem value="Sales and Service Engineer">Sales & Service Engineer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-[11px] text-muted-foreground">Showing {filtered.length} of {technicians.length} members</p>

      {/* Desktop Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/40">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reporting Manager</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(t => {
                const rc = ROLE_CONFIG[t.role] || ROLE_CONFIG['Service Engineer'];
                const RoleIcon = rc.icon;
                return (
                  <tr key={t.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${rc.bg} flex items-center justify-center`}>
                          <RoleIcon size={14} className={rc.color} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{t.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${rc.bg} ${rc.color}`}>
                        <RoleIcon size={10} />
                        {t.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{t.reportingManager || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
                        {t.phone && <span className="flex items-center gap-1"><Phone size={11} /> {t.phone}</span>}
                        {t.email && <span className="flex items-center gap-1"><Mail size={11} /> {t.email}</span>}
                        {!t.phone && !t.email && <span className="text-[11px]">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${t.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                        {t.isActive ? <><UserCheck size={11} /> Active</> : <><UserX size={11} /> Inactive</>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(t)} className="text-xs text-primary font-semibold hover:underline">Edit</button>
                        <button onClick={() => openCredentials(t)} className="text-xs text-accent font-semibold hover:underline flex items-center gap-1">
                          <KeyRound size={10} /> Login
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((t, i) => {
          const rc = ROLE_CONFIG[t.role] || ROLE_CONFIG['Service Engineer'];
          const RoleIcon = rc.icon;
          return (
            <div
              key={t.id}
              className="glass-card p-4 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg ${rc.bg} flex items-center justify-center`}>
                    <RoleIcon size={14} className={rc.color} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{t.employeeCode}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${rc.bg} ${rc.color}`}>
                  {t.role}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mb-2">
                Reports to: <span className="text-foreground font-medium">{t.reportingManager || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                {t.phone && <span className="flex items-center gap-1"><Phone size={10} /> {t.phone}</span>}
                {t.email && <span className="flex items-center gap-1"><Mail size={10} /> {t.email}</span>}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/40">
                <button onClick={() => openEdit(t)} className="text-xs text-primary font-semibold">Edit</button>
                <button onClick={() => openCredentials(t)} className="text-xs text-accent font-semibold flex items-center gap-1">
                  <KeyRound size={10} /> Create Login
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Edit Team Member</DialogTitle></DialogHeader>
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

      {/* Create Login Dialog */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Create Login for {credForm.techName}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
              <Input
                type="email"
                className="mt-1.5 rounded-xl"
                value={credForm.email}
                onChange={e => setCredForm({ ...credForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Password</Label>
              <Input
                type="password"
                className="mt-1.5 rounded-xl"
                placeholder="Min 6 characters"
                value={credForm.password}
                onChange={e => setCredForm({ ...credForm, password: e.target.value })}
              />
            </div>
            <Button
              onClick={handleCreateLogin}
              className="w-full mt-3 rounded-xl h-11 font-semibold gap-2"
              disabled={credLoading}
            >
              <KeyRound size={14} />
              {credLoading ? 'Creating...' : 'Create Login'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
