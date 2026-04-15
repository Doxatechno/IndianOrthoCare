import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Shield, Clock, AlertTriangle, FileText, Mail, Filter, BarChart3 } from 'lucide-react';
import { AMCStatus } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
  const { amcContracts: data, equipment, customers, addAMCContract, updateAMCStatus } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ equipmentId: '', startDate: '', endDate: '', price: '' });
  const [autoCreating, setAutoCreating] = useState(false);

  // Quotation dialog
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [quotationAmcId, setQuotationAmcId] = useState<string | null>(null);
  const [quotationPrice, setQuotationPrice] = useState('');

  // Auto-create AMC contracts for equipment with warranties expiring within 180 days
  const autoCreateAMCForExpiringEquipment = useCallback(async () => {
    if (autoCreating) return;
    setAutoCreating(true);

    try {
      const sb = supabase as any;

      // 1. Get all equipment_ids that already have AMC contracts (server-side, not stale state)
      const { data: existingRows, error: existingErr } = await sb
        .from('amc_contracts')
        .select('equipment_id, id');
      if (existingErr) throw existingErr;

      const coveredEquipmentIds = new Set((existingRows ?? []).map((r: any) => r.equipment_id));

      // 2. Find the current max AMC numeric ID
      let maxNum = 0;
      for (const r of existingRows ?? []) {
        const n = Number(String(r.id).replace('AMC-', ''));
        if (Number.isFinite(n) && n > maxNum) maxNum = n;
      }

      // 3. Filter expiring equipment not already covered
      const expiringEquipment = equipment.filter(e => {
        if (!e.warrantyEndDate) return false;
        const daysLeft = getWarrantyDaysLeft(e.warrantyEndDate);
        if (daysLeft === null || daysLeft < 0) return false;
        if (daysLeft > 180) return false;
        return !coveredEquipmentIds.has(e.id);
      });

      if (expiringEquipment.length === 0) return;

      // 4. Build batch rows with incrementing IDs
      const newRows = expiringEquipment.map((eq, idx) => {
        const warrantyEnd = new Date(eq.warrantyEndDate!);
        const amcStart = new Date(warrantyEnd);
        amcStart.setDate(amcStart.getDate() + 1);
        const amcEnd = new Date(amcStart);
        amcEnd.setFullYear(amcEnd.getFullYear() + 1);
        const newId = `AMC-${String(maxNum + idx + 1).padStart(3, '0')}`;
        const customer = customers.find(c => c.id === eq.customerId);

        return {
          id: newId,
          equipment_id: eq.id,
          equipment_name: eq.name,
          customer_id: eq.customerId,
          customer_name: customer?.name || eq.customerName,
          start_date: amcStart.toISOString().split('T')[0],
          end_date: amcEnd.toISOString().split('T')[0],
          price: 0,
          status: 'Quotation Sent',
          warranty_end_date: eq.warrantyEndDate,
        };
      });

      // 5. Single batch insert
      const { error: insertErr } = await sb.from('amc_contracts').insert(newRows);
      if (insertErr) throw insertErr;

      // 6. Reload full data by re-fetching from context (trigger re-render via window reload workaround)
      // Instead, directly update local state via the data context's loadAllData
      // We'll just reload the page data by calling window.location.reload() — but better: just refetch
      // Simplest: append to local state
      const newAMCs = newRows.map((r: any) => ({
        id: r.id,
        equipmentId: r.equipment_id,
        equipmentName: r.equipment_name,
        customerId: r.customer_id,
        customerName: r.customer_name,
        startDate: r.start_date,
        endDate: r.end_date,
        price: r.price,
        status: r.status as AMCStatus,
      }));
      // We can't directly set amcContracts from here, so reload
      window.location.reload();
    } catch (err) {
      console.error('Auto-create AMC batch failed:', err);
    } finally {
      setAutoCreating(false);
    }
  }, [equipment, customers, autoCreating]);

  useEffect(() => {
    if (equipment.length > 0) {
      autoCreateAMCForExpiringEquipment();
    }
  }, [equipment.length]);

  const warrantyMap = useMemo(() => new Map(equipment.map(e => [e.id, e.warrantyEndDate])), [equipment]);

  // Filtered data
  const filtered = useMemo(() => {
    return data.filter(a => {
      const matchesSearch =
        a.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
        a.customerName.toLowerCase().includes(search.toLowerCase()) ||
        a.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const wEnd = warrantyMap.get(a.equipmentId);
      const daysLeft = getWarrantyDaysLeft(wEnd);
      let matchesWarranty = true;
      if (warrantyFilter === 'all') matchesWarranty = daysLeft !== null && daysLeft >= 0 && daysLeft <= 180;
      else if (warrantyFilter === 'all_including_expired') matchesWarranty = true;
      else if (warrantyFilter === 'expired') matchesWarranty = daysLeft !== null && daysLeft < 0;
      else if (warrantyFilter === 'critical') matchesWarranty = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
      else if (warrantyFilter === 'expiring') matchesWarranty = daysLeft !== null && daysLeft > 30 && daysLeft <= 180;
      else if (warrantyFilter === 'active') matchesWarranty = daysLeft !== null && daysLeft > 180;
      return matchesSearch && matchesStatus && matchesWarranty;
    });
  }, [data, search, statusFilter, warrantyFilter, warrantyMap]);

  // Dashboard stats
  const stats = useMemo(() => {
    const relevant = data.filter(a => { const d = getWarrantyDaysLeft(warrantyMap.get(a.equipmentId)); return d !== null && d >= 0 && d <= 180; });
    const total = relevant.length;
    const quotationCreated = relevant.filter(a => a.price > 0).length;
    const quotationPending = relevant.filter(a => a.price === 0).length;
    const critical = relevant.filter(a => { const d = getWarrantyDaysLeft(warrantyMap.get(a.equipmentId)); return d !== null && d >= 0 && d <= 30; }).length;
    const expiringSoon = relevant.filter(a => { const d = getWarrantyDaysLeft(warrantyMap.get(a.equipmentId)); return d !== null && d > 30 && d <= 180; }).length;
    const expired = data.filter(a => { const d = getWarrantyDaysLeft(warrantyMap.get(a.equipmentId)); return d !== null && d < 0; }).length;
    const byStatus = allStatuses.map(s => ({ status: s, count: relevant.filter(a => a.status === s).length }));
    return { total, quotationCreated, quotationPending, critical, expiringSoon, expired, byStatus };
  }, [data, warrantyMap]);

  const handleAdd = async () => {
    if (!form.equipmentId) return;
    try {
      await addAMCContract({
        equipmentId: form.equipmentId,
        startDate: form.startDate,
        endDate: form.endDate,
        price: Number(form.price) || 0,
      });
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

  // Quotation generation
  const openQuotation = (amcId: string) => {
    setQuotationAmcId(amcId);
    setQuotationPrice('');
    setQuotationDialogOpen(true);
  };

  const generateQuotation = async () => {
    if (!quotationAmcId || !quotationPrice) return;
    const amc = data.find(a => a.id === quotationAmcId);
    if (!amc) return;

    const price = Number(quotationPrice);
    // Update price in DB
    const sb = supabase as any;
    await sb.from('amc_contracts').update({ price }).eq('id', quotationAmcId);
    // Update status to Quotation Sent
    await updateAMCStatus(quotationAmcId, 'Quotation Sent');

    // Find customer email
    const customer = customers.find(c => c.id === amc.customerId);
    const customerEmail = customer?.email || '';
    const customerName = amc.customerName;

    // Build mailto link
    const subject = encodeURIComponent(`AMC Quotation for ${amc.equipmentName} - ${amc.id}`);
    const body = encodeURIComponent(
      `Dear ${customerName},\n\n` +
      `Please find below the AMC quotation details:\n\n` +
      `Equipment: ${amc.equipmentName}\n` +
      `AMC ID: ${amc.id}\n` +
      `AMC Period: ${amc.startDate} to ${amc.endDate}\n` +
      `Quotation Amount: ₹${price.toLocaleString()}\n\n` +
      `Please review and confirm to proceed with the PO.\n\n` +
      `Best Regards,\nService Team`
    );
    const mailtoLink = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');

    setQuotationDialogOpen(false);
    setQuotationAmcId(null);
    setQuotationPrice('');
  };

  const quotationAmc = data.find(a => a.id === quotationAmcId);

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

      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="glass-card border-0">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <BarChart3 size={14} className="text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 cursor-pointer hover:ring-2 ring-success/30 transition-all" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <FileText size={14} className="text-success" />
              <span className="text-[11px] font-semibold text-success uppercase">Quotation Created</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.quotationCreated}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 cursor-pointer hover:ring-2 ring-warning/30 transition-all" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <AlertTriangle size={14} className="text-warning" />
              <span className="text-[11px] font-semibold text-warning uppercase">Quotation Pending</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.quotationPending}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 cursor-pointer hover:ring-2 ring-destructive/30 transition-all" onClick={() => setWarrantyFilter(warrantyFilter === 'critical' ? 'all' : 'critical')}>
          <CardContent className="p-3 text-center">
            <span className="text-[11px] font-semibold text-destructive uppercase">≤30 Days</span>
            <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 cursor-pointer hover:ring-2 ring-warning/30 transition-all" onClick={() => setWarrantyFilter(warrantyFilter === 'expiring' ? 'all' : 'expiring')}>
          <CardContent className="p-3 text-center">
            <span className="text-[11px] font-semibold text-warning uppercase">≤180 Days</span>
            <p className="text-2xl font-bold text-warning">{stats.expiringSoon}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search AMC contracts..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Filter size={14} className="text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-44 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
            <SelectTrigger className="h-9 text-xs w-44 rounded-xl"><SelectValue placeholder="Warranty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active & Expiring</SelectItem>
              <SelectItem value="critical">Critical (≤30d)</SelectItem>
              <SelectItem value="expiring">Expiring (≤180d)</SelectItem>
              <SelectItem value="active">Active (&gt;180d)</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="all_including_expired">All (incl. Expired)</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter !== 'all' || warrantyFilter !== 'all' || search) && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setStatusFilter('all'); setWarrantyFilter('all'); setSearch(''); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {data.length} contracts</p>

      {/* Quotation Dialog */}
      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><FileText size={18} /> Generate Quotation</DialogTitle></DialogHeader>
          {quotationAmc && (
            <div className="space-y-3 pt-2">
              <div className="glass-card p-3 rounded-xl space-y-1 text-sm">
                <p><span className="text-muted-foreground">Equipment:</span> <span className="font-semibold">{quotationAmc.equipmentName}</span></p>
                <p><span className="text-muted-foreground">Customer:</span> <span className="font-semibold">{quotationAmc.customerName}</span></p>
                <p><span className="text-muted-foreground">AMC Period:</span> {quotationAmc.startDate} → {quotationAmc.endDate}</p>
                <p><span className="text-muted-foreground">Warranty:</span> <WarrantyCountdown warrantyEndDate={warrantyMap.get(quotationAmc.equipmentId)} /></p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Quotation Price (₹)</Label>
                <Input
                  type="number"
                  className="mt-1.5 rounded-xl"
                  placeholder="Enter quotation amount"
                  value={quotationPrice}
                  onChange={e => setQuotationPrice(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                onClick={generateQuotation}
                disabled={!quotationPrice || Number(quotationPrice) <= 0}
                className="w-full rounded-xl h-11 font-semibold gap-2"
              >
                <Mail size={16} /> Generate & Send via Email
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">This will open your default email client with the quotation details pre-filled</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Warranty Left</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
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
                    {a.price > 0 ? (
                      <span className="flex items-center gap-0.5"><IndianRupee size={12} />{a.price.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <WarrantyCountdown warrantyEndDate={warrantyMap.get(a.equipmentId)} />
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] rounded-lg gap-1"
                        onClick={() => openQuotation(a.id)}
                      >
                        <FileText size={12} /> Quotation
                      </Button>
                      <Select value="" onValueChange={v => updateStatus(a.id, v as AMCStatus)}>
                        <SelectTrigger className="h-7 text-[11px] w-36 rounded-lg"><SelectValue placeholder="Change Status" /></SelectTrigger>
                        <SelectContent>
                          {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No AMC contracts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
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
              <span className="font-semibold text-foreground flex items-center gap-0.5">
                {a.price > 0 ? <><IndianRupee size={11} />{a.price.toLocaleString()}</> : <span className="text-muted-foreground">No price set</span>}
              </span>
              <span className="text-muted-foreground">{a.startDate} → {a.endDate}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-muted-foreground">Warranty:</span>
              <WarrantyCountdown warrantyEndDate={warrantyMap.get(a.equipmentId)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl gap-1" onClick={() => openQuotation(a.id)}>
                <FileText size={12} /> Quotation
              </Button>
              <Select value="" onValueChange={v => updateStatus(a.id, v as AMCStatus)}>
                <SelectTrigger className="flex-1 h-9 text-xs rounded-xl"><SelectValue placeholder="Change Status" /></SelectTrigger>
                <SelectContent>
                  {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-10 text-muted-foreground text-sm">No AMC contracts found</p>
        )}
      </div>
    </div>
  );
}
