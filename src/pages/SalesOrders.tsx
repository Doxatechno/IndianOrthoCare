import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Search, ShoppingCart, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type SalesOrder = {
  id: string;
  portal_id: string | null;
  customer_name: string;
  order_date: string | null;
  delivery_date: string | null;
  status: string;
  delivery_for: string;
  delivered_pct: number;
  invoiced_pct: number;
  synced_at: string;
};

export default function SalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(1000);
    if (error) toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
    setOrders((data ?? []) as SalesOrder[]);
    if (data?.[0]) setLastSync(data[0].synced_at);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-sales-orders');
      if (error) throw error;
      if ((data as any)?.ok) {
        toast({ title: 'Sync complete', description: `${(data as any).synced} orders pulled from portal` });
        await load();
      } else {
        throw new Error((data as any)?.error || 'Unknown error');
      }
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message ?? String(err), variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const stats = useMemo(() => {
    const total = orders.length;
    const draft = orders.filter((o) => /draft/i.test(o.status)).length;
    const delivered = orders.filter((o) => o.delivered_pct >= 100).length;
    const avgDelivered = total ? Math.round(orders.reduce((s, o) => s + (o.delivered_pct || 0), 0) / total) : 0;
    return { total, draft, delivered, avgDelivered };
  }, [orders]);

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">Sales Orders</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Synced from GrowsmartSMB portal{lastSync && ` · last sync ${new Date(lastSync).toLocaleString('en-IN')}`}
          </p>
        </div>
        <Button onClick={syncNow} disabled={syncing} className="gap-2 shrink-0">
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, icon: ShoppingCart, color: 'from-indigo-500 to-purple-500' },
          { label: 'Draft', value: stats.draft, icon: Clock, color: 'from-amber-500 to-orange-500' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
          { label: 'Avg Delivered %', value: `${stats.avgDelivered}%`, icon: TrendingUp, color: 'from-sky-500 to-blue-500' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>
              <s.icon size={18} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, customer, status…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Order #</th>
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold">Order Date</th>
                <th className="text-left px-4 py-3 font-semibold">Delivery</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Delivered</th>
                <th className="text-right px-4 py-3 font-semibold">Invoiced</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No orders yet. Click <span className="font-semibold text-foreground">Sync now</span> to pull from the portal.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{o.id}</td>
                    <td className="px-4 py-3 max-w-[260px] truncate" title={o.customer_name}>{o.customer_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmt(o.order_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmt(o.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-xs font-medium">
                        {o.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{Math.round(o.delivered_pct)}%</td>
                    <td className="px-4 py-3 text-right font-medium">{Math.round(o.invoiced_pct)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
