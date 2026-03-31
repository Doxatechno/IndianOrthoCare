import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle, CalendarCheck, Shield,
  Cpu, Users, ArrowUpRight, AlertCircle, Siren
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import StatusBadge from '@/components/StatusBadge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ticketStatusData = [
  { name: 'Jan', tickets: 12, completed: 8 },
  { name: 'Feb', tickets: 19, completed: 14 },
  { name: 'Mar', tickets: 15, completed: 11 },
  { name: 'Apr', tickets: 22, completed: 18 },
  { name: 'May', tickets: 18, completed: 15 },
  { name: 'Jun', tickets: 25, completed: 20 },
  { name: 'Jul', tickets: 20, completed: 17 },
];

const CHART_COLORS = ['hsl(250,75%,60%)', 'hsl(310,65%,58%)', 'hsl(190,80%,50%)', 'hsl(38,92%,50%)'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { tickets, equipment, amcContracts, pmSchedules, customers } = useData();

  // Equipment with warranty expiring in next 90 days (potential AMC business)
  const warrantyExpiringSoon = useMemo(() => {
    const now = new Date();
    const in90Days = new Date();
    in90Days.setDate(now.getDate() + 90);

    return equipment
      .filter(e => {
        if (!e.warrantyEndDate) return false;
        const end = new Date(e.warrantyEndDate);
        return end >= now && end <= in90Days;
      })
      .map(e => {
        const end = new Date(e.warrantyEndDate!);
        const daysLeft = Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const hasAMC = amcContracts.some(a => a.equipmentId === e.id && a.status === 'Active');
        return { ...e, daysLeft, hasAMC };
      })
      .filter(e => !e.hasAMC) // Only show those without active AMC
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [equipment, amcContracts]);

  // CRITICAL: Warranty expiring in less than 5 days
  const criticalWarranty = useMemo(() => {
    return warrantyExpiringSoon.filter(e => e.daysLeft <= 5);
  }, [warrantyExpiringSoon]);

  // Tickets open for more than 3 days
  const staleTickets = useMemo(() => {
    const now = new Date();
    return tickets
      .filter(t => t.status !== 'Completed')
      .map(t => {
        const created = new Date(t.createdDate);
        const daysOpen = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return { ...t, daysOpen };
      })
      .filter(t => t.daysOpen > 3)
      .sort((a, b) => b.daysOpen - a.daysOpen);
  }, [tickets]);

  // Equipment with already expired warranty and no AMC
  const warrantyExpired = useMemo(() => {
    const now = new Date();
    return equipment
      .filter(e => {
        if (!e.warrantyEndDate) return false;
        return new Date(e.warrantyEndDate) < now;
      })
      .map(e => {
        const hasAMC = amcContracts.some(a => a.equipmentId === e.id && (a.status === 'Active' || a.status === 'Paid'));
        return { ...e, hasAMC };
      })
      .filter(e => !e.hasAMC)
      .slice(0, 5);
  }, [equipment, amcContracts]);

  const topCards = [
    {
      label: 'Installations',
      value: tickets.filter(t => t.status === 'Completed').length,
      subtitle: 'Completed this month',
      icon: CheckCircle2,
      gradient: 'gradient-card-1',
      trend: '+12%',
      link: '/tickets'
    },
    {
      label: 'Pending',
      value: tickets.filter(t => t.status === 'Pending' || t.status === 'Assigned').length,
      subtitle: 'Awaiting action',
      icon: Clock,
      gradient: 'gradient-card-2',
      trend: '-5%',
      link: '/tickets'
    },
    {
      label: 'Active AMCs',
      value: amcContracts.filter(a => a.status === 'Active').length,
      subtitle: 'Running contracts',
      icon: Shield,
      gradient: 'gradient-card-3',
      trend: '+15%',
      link: '/amc'
    },
    {
      label: 'Upcoming PMs',
      value: pmSchedules.filter(p => p.status === 'Pending').length,
      subtitle: 'Next 30 days',
      icon: CalendarCheck,
      gradient: 'gradient-card-4',
      trend: '3 due',
      link: '/pm-schedules'
    },
  ];

  const bottomStats = [
    { label: 'In Progress', value: tickets.filter(t => t.status === 'In Progress').length, icon: ClipboardList, color: 'text-info', bg: 'bg-info/10', link: '/tickets' },
    { label: 'Issues', value: tickets.filter(t => t.status === 'Issue Reported').length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', link: '/tickets' },
    { label: 'Equipment', value: equipment.length, icon: Cpu, color: 'text-primary', bg: 'bg-primary/10', link: '/equipment' },
    { label: 'Customers', value: customers.length, icon: Users, color: 'text-accent', bg: 'bg-accent/10', link: '/customers' },
  ];

  const amcPieData = [
    { name: 'Active', value: amcContracts.filter(a => a.status === 'Active').length },
    { name: 'Paid', value: amcContracts.filter(a => a.status === 'Paid').length },
    { name: 'Quotation Sent', value: amcContracts.filter(a => a.status === 'Quotation Sent').length },
    { name: 'Approved', value: amcContracts.filter(a => a.status === 'Approved').length },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card, index) => (
          <div
            key={card.label}
            onClick={() => navigate(card.link)}
            className={`${card.gradient} rounded-2xl p-5 text-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer opacity-0 animate-fade-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-sm" />
            <div className="absolute -right-2 -bottom-6 w-16 h-16 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <card.icon size={18} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">{card.trend}</span>
              </div>
              <p className="text-2xl font-extrabold font-display">{card.value}</p>
              <p className="text-[13px] font-semibold opacity-90 mt-0.5">{card.label}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass-card p-5 opacity-0 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">Service History</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tickets vs completions over time</p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Tickets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-muted-foreground">Completed</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={ticketStatusData}>
              <defs>
                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(250,75%,60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(250,75%,60%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(190,80%,50%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(190,80%,50%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,20%,90%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(230,10%,46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(230,10%,46%)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid hsl(230,20%,90%)',
                  fontSize: '12px',
                  boxShadow: '0 10px 40px -10px hsl(230 30% 50% / 0.15)',
                  backdropFilter: 'blur(10px)',
                  background: 'hsl(0 0% 100% / 0.9)',
                  padding: '10px 16px'
                }}
              />
              <Area type="monotone" dataKey="tickets" stroke="hsl(250,75%,60%)" strokeWidth={2.5} fill="url(#colorTickets)" dot={false} />
              <Area type="monotone" dataKey="completed" stroke="hsl(190,80%,50%)" strokeWidth={2.5} fill="url(#colorCompleted)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-card p-5 flex-1 opacity-0 animate-fade-in" style={{ animationDelay: '500ms' }}>
            <h3 className="text-sm font-bold text-foreground font-display mb-1">AMC Status</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Contract breakdown</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={amcPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  dataKey="value"
                  strokeWidth={3}
                  stroke="hsl(0 0% 100% / 0.8)"
                  paddingAngle={3}
                >
                  {amcPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(230,20%,90%)', fontSize: '12px', boxShadow: '0 10px 25px -5px hsl(230 30% 50% / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {amcPieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 opacity-0 animate-fade-in" style={{ animationDelay: '600ms' }}>
        {bottomStats.map(stat => (
          <div key={stat.label} onClick={() => navigate(stat.link)} className="glass-card p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon size={16} className={stat.color} strokeWidth={2} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground font-display">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">Recent Tickets</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Latest installations</p>
            </div>
            <a href="/tickets" className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline underline-offset-2">
              View all <ArrowUpRight size={11} />
            </a>
          </div>
          <div className="divide-y divide-border/40">
            {tickets.slice(0, 4).map(ticket => (
              <div key={ticket.id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Cpu size={13} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{ticket.equipmentName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{ticket.customerName} · {ticket.id}</p>
                  </div>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">Upcoming PM Visits</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Preventive maintenance</p>
            </div>
            <a href="/pm-schedules" className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline underline-offset-2">
              View all <ArrowUpRight size={11} />
            </a>
          </div>
          <div className="divide-y divide-border/40">
            {pmSchedules.filter(p => p.status !== 'Completed').slice(0, 4).map(pm => (
              <div key={pm.id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <CalendarCheck size={13} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">PM{pm.pmNumber} — {pm.equipmentName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{pm.customerName} · {pm.plannedDate}</p>
                  </div>
                </div>
                <StatusBadge status={pm.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warranty Expiry & AMC Opportunities */}
      {(warrantyExpiringSoon.length > 0 || warrantyExpired.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Expiring Soon */}
          {warrantyExpiringSoon.length > 0 && (
            <div className="glass-card overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: '900ms' }}>
              <div className="flex items-center justify-between p-5 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    Warranty Expiring Soon
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Potential AMC business opportunities</p>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{warrantyExpiringSoon.length} items</span>
              </div>
              <div className="divide-y divide-border/40">
                {warrantyExpiringSoon.slice(0, 5).map(e => (
                  <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle size={13} className="text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{e.customerName} · {e.serialNumber}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${e.daysLeft <= 15 ? 'text-destructive' : e.daysLeft <= 30 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {e.daysLeft}d left
                      </p>
                      <p className="text-[9px] text-muted-foreground">{e.warrantyEndDate}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3">
                <a href="/amc" className="block text-center text-[11px] text-primary font-semibold py-2 rounded-xl hover:bg-primary/5 transition-colors">
                  Create AMC Contracts →
                </a>
              </div>
            </div>
          )}

          {/* Already Expired - No AMC */}
          {warrantyExpired.length > 0 && (
            <div className="glass-card overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: '1000ms' }}>
              <div className="flex items-center justify-between p-5 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                    <AlertCircle size={14} className="text-destructive" />
                    Warranty Expired — No AMC
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Equipment without coverage — follow up for AMC</p>
                </div>
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">{warrantyExpired.length} items</span>
              </div>
              <div className="divide-y divide-border/40">
                {warrantyExpired.map(e => (
                  <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <Cpu size={13} className="text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{e.customerName}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Expired</span>
                  </div>
                ))}
              </div>
              <div className="p-3">
                <a href="/amc" className="block text-center text-[11px] text-primary font-semibold py-2 rounded-xl hover:bg-primary/5 transition-colors">
                  Create AMC Contracts →
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
