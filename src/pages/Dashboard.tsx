import { 
  ClipboardList, CheckCircle2, Clock, AlertTriangle, CalendarCheck, Shield, 
  Cpu, Users, ArrowUpRight, TrendingUp, Activity
} from 'lucide-react';
import { tickets, equipment, amcContracts, pmSchedules, customers } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const stats = [
  { label: 'Total Installations', value: tickets.filter(t => t.status === 'Completed').length, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', trend: '+12%' },
  { label: 'Pending Tickets', value: tickets.filter(t => t.status === 'Pending' || t.status === 'Assigned').length, icon: Clock, color: 'text-warning', bg: 'bg-warning/10', trend: '-5%' },
  { label: 'In Progress', value: tickets.filter(t => t.status === 'In Progress').length, icon: ClipboardList, color: 'text-info', bg: 'bg-info/10', trend: '+8%' },
  { label: 'Issues Reported', value: tickets.filter(t => t.status === 'Issue Reported').length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', trend: '-2%' },
  { label: 'Active AMCs', value: amcContracts.filter(a => a.status === 'Active').length, icon: Shield, color: 'text-accent', bg: 'bg-accent/10', trend: '+15%' },
  { label: 'Upcoming PMs', value: pmSchedules.filter(p => p.status === 'Pending').length, icon: CalendarCheck, color: 'text-primary', bg: 'bg-primary/10', trend: '3 due' },
  { label: 'Total Equipment', value: equipment.length, icon: Cpu, color: 'text-foreground', bg: 'bg-secondary', trend: '+4' },
  { label: 'Customers', value: customers.length, icon: Users, color: 'text-foreground', bg: 'bg-secondary', trend: '+2' },
];

const ticketStatusData = [
  { name: 'Pending', count: tickets.filter(t => t.status === 'Pending').length },
  { name: 'Assigned', count: tickets.filter(t => t.status === 'Assigned').length },
  { name: 'In Progress', count: tickets.filter(t => t.status === 'In Progress').length },
  { name: 'Completed', count: tickets.filter(t => t.status === 'Completed').length },
  { name: 'Issues', count: tickets.filter(t => t.status === 'Issue Reported').length },
];

const CHART_COLORS = ['hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(199,89%,38%)', 'hsl(162,63%,41%)', 'hsl(0,84%,60%)'];

const amcPieData = [
  { name: 'Active', value: amcContracts.filter(a => a.status === 'Active').length },
  { name: 'Paid', value: amcContracts.filter(a => a.status === 'Paid').length },
  { name: 'Quotation Sent', value: amcContracts.filter(a => a.status === 'Quotation Sent').length },
  { name: 'Approved', value: amcContracts.filter(a => a.status === 'Approved').length },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="healthcare-gradient rounded-2xl p-6 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="opacity-80" />
            <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Live Overview</span>
          </div>
          <h2 className="text-xl font-bold font-display">Welcome back, Admin</h2>
          <p className="text-sm opacity-80 mt-1">You have {tickets.filter(t => t.status === 'Pending').length} pending tickets and {pmSchedules.filter(p => p.status === 'Pending').length} upcoming PM visits today.</p>
        </div>
        <div className="absolute right-0 top-0 w-40 h-full opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path d="M100 20 C120 20, 140 40, 140 60 C140 90, 100 120, 100 120 C100 120, 60 90, 60 60 C60 40, 80 20, 100 20Z" fill="currentColor"/>
          </svg>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat, index) => (
          <div 
            key={stat.label} 
            className="stat-card"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">{stat.trend}</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-display">{stat.value}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">Ticket Status</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Installation ticket overview</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp size={14} className="text-primary" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ticketStatusData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220,10%,46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220,10%,46%)' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid hsl(214,20%,90%)', 
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px hsl(220 30% 12% / 0.1)',
                  padding: '8px 14px'
                }} 
              />
              <Bar dataKey="count" fill="hsl(199,89%,38%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">AMC Distribution</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Contract status breakdown</p>
            </div>
            <div className="p-2 rounded-lg bg-accent/10">
              <Shield size={14} className="text-accent" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie 
                data={amcPieData} 
                cx="50%" 
                cy="50%" 
                innerRadius={50}
                outerRadius={80} 
                dataKey="value" 
                label={({ name, value }) => `${name} (${value})`} 
                labelLine={false} 
                fontSize={11}
                strokeWidth={2}
                stroke="hsl(0 0% 100%)"
              >
                {amcPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214,20%,90%)', fontSize: '12px', boxShadow: '0 10px 25px -5px hsl(220 30% 12% / 0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tickets */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">Recent Tickets</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Latest installation tickets</p>
            </div>
            <a href="/tickets" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline underline-offset-2 transition-colors">
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="divide-y divide-border/50">
            {tickets.slice(0, 4).map((ticket, i) => (
              <div key={ticket.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Cpu size={14} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ticket.equipmentName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{ticket.customerName} · {ticket.id}</p>
                  </div>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming PM */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">Upcoming PM Visits</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Scheduled preventive maintenance</p>
            </div>
            <a href="/pm-schedules" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline underline-offset-2 transition-colors">
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="divide-y divide-border/50">
            {pmSchedules.filter(p => p.status !== 'Completed').slice(0, 4).map((pm, i) => (
              <div key={pm.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <CalendarCheck size={14} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">PM{pm.pmNumber} — {pm.equipmentName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{pm.customerName} · {pm.plannedDate}</p>
                  </div>
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
