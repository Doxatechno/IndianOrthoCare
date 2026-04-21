import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Heart, LogIn, Eye, EyeOff, Cpu, Shield, CalendarCheck,
  ClipboardList, Users, Wrench, QrCode, BarChart3, Sparkles, CheckCircle2
} from 'lucide-react';

const features = [
  { icon: Cpu, title: 'Equipment Registry', desc: 'Track every device, serial number & warranty in one place.' },
  { icon: Shield, title: 'AMC Contracts', desc: 'Manage annual maintenance contracts with automated billing stages.' },
  { icon: CalendarCheck, title: 'PM Scheduling', desc: 'Auto-generate quarterly preventive maintenance plans.' },
  { icon: ClipboardList, title: 'Service Tickets', desc: 'Create, assign and resolve service requests in real time.' },
  { icon: Wrench, title: 'Technician Portal', desc: 'Mobile-first interface for field engineers with offline support.' },
  { icon: QrCode, title: 'QR Code Tickets', desc: 'Customers raise tickets instantly by scanning equipment QR codes.' },
];

const stats = [
  { value: '24/7', label: 'Uptime' },
  { value: '< 2h', label: 'Response' },
  { value: '100%', label: 'Tracked' },
];

export default function AdminLogin() {
  const { signIn, user, isAdmin, isTechnician, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && isAdmin) navigate('/', { replace: true });
    else if (user && isTechnician) navigate('/technician-portal', { replace: true });
  }, [user, isAdmin, isTechnician, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden" style={{ background: 'hsl(240, 30%, 8%)' }}>
      {/* LEFT: Feature showcase */}
      <div
        className="relative flex-1 hidden lg:flex flex-col justify-between p-12 xl:p-16 overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 20% 0%, hsl(280, 70%, 35%) 0%, transparent 50%), radial-gradient(circle at 80% 100%, hsl(200, 80%, 30%) 0%, transparent 50%), linear-gradient(160deg, hsl(260, 60%, 22%) 0%, hsl(240, 55%, 14%) 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(280, 80%, 60%) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(180, 80%, 60%) 0%, transparent 70%)' }} />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-2xl">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight font-display">Doxa CareX</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-[0.25em] font-semibold">Service Manager</p>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-xs font-semibold text-white/80 tracking-wide">Medical Equipment Service Platform</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] font-display tracking-tight mb-5">
            Keep critical care equipment{' '}
            <span style={{ background: 'linear-gradient(135deg, hsl(180, 90%, 65%), hsl(280, 90%, 70%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              running, always.
            </span>
          </h2>
          <p className="text-base text-white/65 leading-relaxed mb-8 max-w-md">
            One control center to manage equipment, contracts, preventive maintenance and field service — built for hospitals and biomedical service teams.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {features.map(f => (
              <div
                key={f.title}
                className="group p-4 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/10 transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 50%), hsl(240, 60%, 40%))' }}>
                  <f.icon className="w-4 h-4 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="text-[13px] font-bold text-white mb-1">{f.title}</h3>
                <p className="text-[11px] text-white/55 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats footer */}
        <div className="relative z-10 flex items-center gap-8 pt-6 border-t border-white/8">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-white font-display">{s.value}</div>
              <div className="text-[10px] text-white/45 uppercase tracking-[0.2em] font-semibold mt-1">{s.label}</div>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-white/45">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Trusted by service teams</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Login form */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-10 bg-white relative">
        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, hsl(280, 70%, 55%), hsl(240, 65%, 40%))' }}>
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight font-display">Doxa CareX</h1>
            <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em] font-semibold">Service Manager</p>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-4"
            style={{ background: 'hsl(260, 60%, 96%)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(260, 60%, 50%)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(260, 60%, 40%)' }}>Admin Portal</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 font-display tracking-tight mb-2">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-8">Sign in to manage your service operations.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Email</label>
              <input
                type="email"
                className="w-full mt-2 px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50/60 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
                placeholder="admin@doxacarex.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50/60 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-purple-400 pr-12 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-xs font-medium flex items-start gap-2"
                style={{ background: 'hsl(0, 80%, 97%)', color: 'hsl(0, 70%, 40%)', border: '1px solid hsl(0, 70%, 90%)' }}>
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:shadow-2xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, hsl(270, 65%, 50%), hsl(240, 65%, 38%))' }}
            >
              <LogIn size={17} />
              {submitting ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-gray-100">
            {[
              { icon: Shield, label: 'Secure' },
              { icon: CheckCircle2, label: 'Verified' },
              { icon: BarChart3, label: 'Real-time' },
            ].map(b => (
              <div key={b.label} className="flex flex-col items-center gap-1.5 py-2">
                <b.icon className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{b.label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Are you a technician?{' '}
            <a href="/technician-login" className="font-bold hover:underline" style={{ color: 'hsl(260, 60%, 50%)' }}>
              Sign in here
            </a>
          </p>
        </div>

        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-300 uppercase tracking-[0.2em] font-semibold">
          © Doxa CareX
        </p>
      </div>
    </div>
  );
}
