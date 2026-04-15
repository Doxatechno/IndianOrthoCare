import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, IndianRupee, Shield, Clock, AlertTriangle } from 'lucide-react';
import { AMCStatus } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';

const allStatuses: AMCStatus[] = ['Quotation Sent', 'PO Released', 'Invoice Generated', 'Payment Received'];

function getWarrantyDaysLeft(warrantyEndDate: string | null | undefined): number | null {
  if (!warrantyEndDate) return null;
  const end = new Date(warrantyEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function WarrantyCountdown({ warrantyEndDate }: { warrantyEndDate: string | null | undefined }) {
  const daysLeft = getWarrantyDaysLeft(warrantyEndDate);
  if (daysLeft === null) return <span className="text-[11px] text-muted-foreground">No warranty</span>;

  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive">
        <AlertTriangle size={11} /> Expired {Math.abs(daysLeft)}d ago
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive animate-pulse">
        <Clock size={11} /> {daysLeft}d left
      </span>
    );
  }
  if (daysLeft <= 180) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning">
        <Clock size={11} /> {daysLeft}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
      <Clock size={11} /> {daysLeft}d left
    </span>
  );
}

export default function AMCContracts() {
  const { amcContracts: data, equipment, addAMCContract, updateAMCStatus } = useData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ equipmentId: '', startDate: '', endDate: '', price: '' });
  const [autoCreating, setAutoCreating] = useState(false);

  // Auto-create AMC contracts for equipment with warranties expiring within 180 days
  const autoCreateAMCForExpiringEquipment = useCallback(async () => {
    if (autoCreating) return;
    const now = new Date();
    const expiringEquipment = equipment.filter(e => {
      if (!e.warrantyEndDate) return false;
      const daysLeft = getWarrantyDaysLeft(e.warrantyEndDate);
      if (daysLeft === null || daysLeft < 0) return false;
      if (daysLeft > 180) return false;
      // Check if AMC already exists for this equipment
      const hasAMC = data.some(a => a.equipmentId === e.id);
      return !hasAMC;
    });

    if (expiringEquipment.length === 0) return;

    setAutoCreating(true);
    for (const eq of expiringEquipment) {
      const warrantyEnd = new Date(eq.warrantyEndDate!);
      const amcStart = new Date(warrantyEnd);
      amcStart.setDate(amcStart.getDate() + 1);
      const amcEnd = new Date(amcStart);
      amcEnd.setFullYear(amcEnd.getFullYear() + 1);

      try {
        await addAMCContract({
          equipmentId: eq.id,
          startDate: amcStart.toISOString().split('T')[0],
          endDate: amcEnd.toISOString().split('T')[0],
          price: 0,
        });
        // Also update warranty_end_date on the amc_contracts row
        const sb = supabase as any;
        const latestAmc = data.find(a => a.equipmentId === eq.id);
        if (!latestAmc) {
          // The newly added one will be the latest
          const { data: rows } = await sb.from('amc_contracts').select('id').eq('equipment_id', eq.id).order('id', { ascending: false }).limit(1);
          if (rows && rows.length > 0) {
            await sb.from('amc_contracts').update({ warranty_end_date: eq.warrantyEndDate }).eq('id', rows[0].id);
          }
        }
      } catch (err) {
        console.error('Auto-create AMC failed for', eq.id, err);
      }
    }
    setAutoCreating(false);
  }, [equipment, data, addAMCContract, autoCreating]);

  useEffect(() => {
    if (equipment.length > 0 && data.length >= 0) {
      autoCreateAMCForExpiringEquipment();
    }
  }, [equipment.length]); // Only run when equipment loads

  // Build warranty end date map from equipment
  const warrantyMap = new Map(equipment.map(e => [e.id, e.warrantyEndDate]));

  const filtered = data.filter(a =>
    a.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
    a.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.equipmentId) return;
    try {
      await addAMCContract({
        equipmentId: form.equipmentId,
        startDate: form.startDate,
        endDate: form.endDate,
        price: Number(form.price) || 0,
      });
      // Update warranty_end_date
      const eq = equipment.find(e => e.id === form.equipmentId);
      if (eq?.warrantyEndDate) {
        const sb = supabase as any;
        const { data: rows } = await sb.from('amc_contracts').select('id').eq('equipment_id', form.equipmentId).order('id', { ascending: false }).limit(1);
        if (rows && rows.length > 0) {
          await sb.from('amc_contracts').update({ warranty_end_date: eq.warrantyEndDate }).eq('id', rows[0].id);
        }
      }
      setForm({ equipmentId: '', startDate: '', endDate: '', price: '' });
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to create AMC contract:', error);
    }
  };

  const updateStatus = async (amcId: string, status: AMCStatus) => {
    try {
      await updateAMCStatus(amcId, status);
    } catch (error) {
      console.error('Failed to update AMC status:', error);
    }
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

      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/40">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Equipment</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Period</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Warranty Left</th>
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
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    <span className="flex items-center gap-0.5"><IndianRupee size={12} />{a.price.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <WarrantyCountdown warrantyEndDate={warrantyMap.get(a.equipmentId)} />
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-3.5">
                    <Select value={a.status} onValueChange={v => updateStatus(a.id, v as AMCStatus)}>
                      <SelectTrigger className="h-8 text-xs w-40 rounded-lg"><SelectValue /></SelectTrigger>
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
            <div className="flex items-center justify-between text-[12px] mb-2">
              <span className="font-semibold text-foreground flex items-center gap-0.5"><IndianRupee size={11} />{a.price.toLocaleString()}</span>
              <span className="text-muted-foreground">{a.startDate} → {a.endDate}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-muted-foreground">Warranty:</span>
              <WarrantyCountdown warrantyEndDate={warrantyMap.get(a.equipmentId)} />
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
