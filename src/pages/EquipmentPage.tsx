import { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, Cpu } from 'lucide-react';
import { Equipment } from '@/data/mockData';
import { useData } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/StatusBadge';
import EquipmentQRLabel from '@/components/EquipmentQRLabel';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import EquipmentAddDialog from '@/components/equipment/EquipmentAddDialog';
import EquipmentEditDialog from '@/components/equipment/EquipmentEditDialog';

export default function EquipmentPage() {
  const { customers, equipment, addEquipment, updateEquipment } = useData();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Equipment | null>(null);
  const [qrEquipment, setQrEquipment] = useState<Equipment | null>(null);

  const filtered = useMemo(() =>
    equipment.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.customerName.toLowerCase().includes(search.toLowerCase())
    ), [equipment, search]);

  const handleEdit = (e: Equipment) => {
    setEditForm({ ...e });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm || !editForm.name || !editForm.customerId) return;
    try {
      await updateEquipment(editForm);
      setEditDialogOpen(false);
      setEditForm(null);
    } catch (error) {
      console.error('Failed to update equipment:', error);
    }
  };

  const getWarrantyStatus = (e: Equipment) => {
    if (!e.warrantyEndDate) return null;
    const end = new Date(e.warrantyEndDate);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= 90) return 'Expiring Soon';
    return 'Active';
  };

  // Stats
  const totalCount = equipment.length;
  const activeWarranty = equipment.filter(e => getWarrantyStatus(e) === 'Active').length;
  const expiringSoon = equipment.filter(e => getWarrantyStatus(e) === 'Expiring Soon').length;
  const expired = equipment.filter(e => getWarrantyStatus(e) === 'Expired').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header font-display">Equipment</h1>
          <p className="page-subheader">Manage medical equipment inventory</p>
        </div>
        <EquipmentAddDialog customers={customers} onAdd={addEquipment} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Equipment', value: totalCount, color: 'bg-primary/10 text-primary' },
          { label: 'Active Warranty', value: activeWarranty, color: 'bg-success/10 text-success' },
          { label: 'Expiring Soon', value: expiringSoon, color: 'bg-warning/10 text-warning' },
          { label: 'Expired', value: expired, color: 'bg-destructive/10 text-destructive' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & view toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, serial, customer..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Tabs value={view} onValueChange={v => setView(v as 'grid' | 'list')} className="hidden sm:block">
          <TabsList className="rounded-xl h-9 p-1">
            <TabsTrigger value="grid" className="rounded-lg h-7 px-3 text-xs gap-1.5"><LayoutGrid size={13} /> Grid</TabsTrigger>
            <TabsTrigger value="list" className="rounded-lg h-7 px-3 text-xs gap-1.5"><List size={13} /> List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((e, i) => (
            <EquipmentCard key={e.id} equipment={e} index={i} onEdit={handleEdit} onQr={setQrEquipment} />
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="hidden md:block rounded-2xl border border-border/60 bg-card overflow-hidden">
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
                {filtered.map((e, i) => {
                  const ws = getWarrantyStatus(e);
                  return (
                    <tr key={e.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => handleEdit(e)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-secondary/60 flex items-center justify-center">
                            <Cpu size={14} className="text-primary" />
                          </div>
                          <span className="font-semibold text-foreground">{e.name}</span>
                        </div>
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
      )}

      {/* Mobile always shows grid */}
      {view === 'list' && (
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((e, i) => (
            <EquipmentCard key={e.id} equipment={e} index={i} onEdit={handleEdit} onQr={setQrEquipment} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Cpu size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No equipment found</p>
          <p className="text-sm">Try adjusting your search or add new equipment</p>
        </div>
      )}

      {/* Edit Dialog */}
      <EquipmentEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        customers={customers}
        onSave={handleEditSave}
      />

      {/* QR Label */}
      {qrEquipment && (
        <EquipmentQRLabel
          open={!!qrEquipment}
          onOpenChange={(open) => !open && setQrEquipment(null)}
          equipment={qrEquipment}
        />
      )}
    </div>
  );
}
