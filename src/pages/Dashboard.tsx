import { 
  ClipboardList, CheckCircle2, Clock, AlertTriangle, CalendarCheck, Shield, 
  Cpu, Users, TrendingUp, ArrowUpRight
} from 'lucide-react';
import { tickets, equipment, amcContracts, pmSchedules, customers } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const stats = [
  { label: 'Total Installations', value: tickets.filter(t => t.status === 'Completed').length, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Pending Tickets', value: tickets.filter(t => t.status === 'Pending' || t.status === 'Assigned').length, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  { label: 'In Progress', value: tickets.filter(t => t.status === 'In Progress').length, icon: ClipboardList, color: 'text-info', bg: 'bg-info/10' },
  { label: 'Issues Reported', value: tickets.filter(t => t.status === 'Issue Reported').length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  { label: 'Active AMCs', value: amcContracts.filter(a => a.status === 'Active').length, icon: Shield, color: 'text-accent', bg: 'bg-accent/10' },
  { label: 'Upcoming PMs', value: pmSchedules.filter(p => p.status === 'Pending').length, icon: CalendarCheck, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Total Equipment', value: equipment.length, icon: Cpu, color: 'text-foreground', bg: 'bg-secondary' },
  { label: 'Customers', value: customers.length, icon: Users, color: 'text-foreground', bg: 'bg-secondary' },
];

const ticketStatusData = [
  { name: 'Pending', count: tickets.filter(t => t.status === 'Pending').length },
  { name: 'Assigned', count: tickets.filter(t => t.status === 'Assigned').length },
  { name: 'In Progress', count: tickets.filter(t => t.status === 'In Progress').length },
  { name: 'Completed', count: tickets.filter(t => t.status === 'Completed').length },
  { name: 'Issues', count: tickets.filter(t => t.status === 'Issue Reported').length },
];

const CHART_COLORS = ['hsl(38,92%,50%)', 'hsl(210,80%,55%)', 'hsl(210,80%,45%)', 'hsl(152,55%,42%)', 'hsl(0,72%,55%)'];

const amcPieData = [
  { name: 'Active', value: amcContracts.filter(a => a.status === 'Active').length },
  { name: 'Paid', value: amcContracts.filter(a => a.status === 'Paid').length },
  { name: 'Quotation Sent', value: amcContracts.filter(a => a.status === 'Quotation Sent').length },
  { name: 'Approved', value: amcContracts.filter(a => a.status === 'Approved').length },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ticket Status Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ticketStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,18%,88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215,10%,50%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215,10%,50%)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210,18%,88%)', fontSize: '12px' }} />
              <Bar dataKey="count" fill="hsl(210,80%,45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">AMC Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={amcPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={11}>
                {amcPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210,18%,88%)', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tickets */}
        <div className="bg-card rounded-xl border border-border/50 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">Recent Tickets</h3>
            <a href="/tickets" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">View all <ArrowUpRight size={12} /></a>
          </div>
          <div className="divide-y divide-border/50">
            {tickets.slice(0, 4).map(ticket => (
              <div key={ticket.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{ticket.equipmentName}</p>
                  <p className="text-xs text-muted-foreground">{ticket.customerName} · {ticket.id}</p>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming PM */}
        <div className="bg-card rounded-xl border border-border/50 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">Upcoming PM Visits</h3>
            <a href="/pm-schedules" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">View all <ArrowUpRight size={12} /></a>
          </div>
          <div className="divide-y divide-border/50">
            {pmSchedules.filter(p => p.status !== 'Completed').slice(0, 4).map(pm => (
              <div key={pm.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">PM{pm.pmNumber} — {pm.equipmentName}</p>
                  <p className="text-xs text-muted-foreground">{pm.customerName} · {pm.plannedDate}</p>
                </div>
                <StatusBadge status={pm.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
