import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Cpu, ClipboardList, Shield, CalendarCheck, 
  Menu, X, ChevronRight, Bell, Search, Heart, Settings, Wrench
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/equipment', label: 'Equipment', icon: Cpu },
  { path: '/tickets', label: 'Tickets', icon: ClipboardList },
  { path: '/technicians', label: 'Technicians', icon: Wrench },
  { path: '/amc', label: 'AMC Contracts', icon: Shield },
  { path: '/pm-schedules', label: 'PM Schedules', icon: CalendarCheck },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentPage = navItems.find(item => item.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[240px] text-sidebar-foreground
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col overflow-hidden
        `}
        style={{ background: 'linear-gradient(180deg, hsl(260, 60%, 30%), hsl(240, 50%, 20%))' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-[72px] px-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight font-display">Doxa CareX</h1>
              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-medium">Service Manager</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm border border-white/10' 
                    : 'text-white/55 hover:bg-white/8 hover:text-white/80'}
                `}
              >
                <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.6} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={13} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 mb-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/8 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">Admin User</p>
              <p className="text-[10px] text-white/35 font-medium">Administrator</p>
            </div>
            <Settings size={14} className="text-white/30 hover:text-white/60 cursor-pointer transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-[68px] bg-card/50 backdrop-blur-xl border-b border-white/30 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-foreground font-display">{currentPage}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-secondary/60 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
              <Search size={15} className="text-muted-foreground" />
              <input placeholder="Search..." className="bg-transparent text-sm outline-none w-32 lg:w-48 placeholder:text-muted-foreground/60" />
            </div>
            <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200 relative active:scale-95">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white shadow-md ml-1 cursor-pointer hover:shadow-lg transition-shadow">
              AD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
