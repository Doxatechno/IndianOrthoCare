import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Cpu, ClipboardList, Shield, CalendarCheck, 
  Menu, X, ChevronRight, Bell, Search, Activity, Heart
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/equipment', label: 'Equipment', icon: Cpu },
  { path: '/tickets', label: 'Installation Tickets', icon: ClipboardList },
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
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[280px] bg-sidebar text-sidebar-foreground
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-[72px] px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl healthcare-gradient flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-primary-foreground" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-sidebar-primary-foreground tracking-tight font-display">MedServ Pro</h1>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-[0.15em] font-medium">Service Manager</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold">Main Menu</p>
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
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg' 
                    : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                `}
                style={isActive ? { boxShadow: '0 4px 14px 0 hsl(199 89% 48% / 0.3)' } : {}}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 mx-3 mb-3 rounded-xl bg-sidebar-accent/60 border border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full healthcare-gradient flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-sidebar-primary-foreground truncate">Admin User</p>
              <p className="text-[10px] text-sidebar-foreground/45 font-medium">Administrator</p>
            </div>
            <Activity size={14} className="text-accent animate-pulse-soft" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-[72px] bg-card/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-foreground font-display">{currentPage}</h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Medical Equipment Service Management</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-95">
              <Search size={18} />
            </button>
            <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 relative active:scale-95">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
