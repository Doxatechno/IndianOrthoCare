import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowUpRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Row = {
  id: string;
  customer_name: string;
  order_date: string | null;
  status: string;
  delivered_pct: number;
  synced_at: string;
};

export default function SalesOrdersWidget() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const [{ data: recent }, { count }] = await Promise.all([
      supabase
        .from('sales_orders')
        .select('id,customer_name,order_date,status,delivered_pct,synced_at')
        .order('order_date', { ascending: false })
        .limit(5),
      supabase.from('sales_orders').select('id', { count: 'exact', head: true }),
    ]);
    setRows((recent ?? []) as Row[]);
    setTotal(count ?? 0);
    if (recent?.[0]) setLastSync(recent[0].synced_at);
  };

  useEffect(() => { load(); }, []);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-sales-orders');
      if (error) throw error;
      if ((data as any)?.ok) {
        toast({ title: 'Synced', description: `${(data as any).synced} orders updated` });
        await load();
      } else throw new Error((data as any)?.error || 'Sync failed');
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message ?? String(err), variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—');

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0">
            <ShoppingCart size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold font-display truncate">Sales Orders</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {total} total{lastSync && ` · synced ${new Date(lastSync).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing} className="h-8 gap-1.5 text-xs">
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{syncing ? 'Syncing' : 'Sync'}</span>
          </Button>
          <Link to="/sales-orders" className="text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No orders yet. Click <span className="font-semibold text-foreground">Sync</span> to pull from the portal.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="font-mono text-[11px] font-bold w-16 shrink-0">{r.id}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{r.customer_name || '—'}</p>
                <p className="text-[10px] text-muted-foreground">{fmt(r.order_date)} · {r.status}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold">{Math.round(r.delivered_pct)}%</p>
                <p className="text-[10px] text-muted-foreground">delivered</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
