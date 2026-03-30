import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Heart, LogIn, Eye, EyeOff, Stethoscope } from 'lucide-react';

export default function TechnicianLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/technician-portal');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
      {/* Top decorative area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] right-[-40px] w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20px] left-[-30px] w-32 h-32 rounded-full opacity-8" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-2xl" style={{ background: 'linear-gradient(135deg, hsl(280, 70%, 65%), hsl(260, 60%, 50%))' }}>
          <Stethoscope size={36} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display">MedServ Pro</h1>
        <p className="text-white/60 text-sm mt-1">Technician Portal</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl" style={{ minHeight: '55vh' }}>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Welcome Back</h2>
        <p className="text-sm text-gray-400 mb-6">Sign in to access your assignments</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
            <input
              type="email"
              className="w-full mt-2 px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/80 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              style={{ focusRingColor: 'hsl(260, 60%, 55%)' }}
              placeholder="your.email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/80 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:border-transparent pr-12 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl px-4 py-3 text-xs font-medium" style={{ background: 'hsl(0, 80%, 95%)', color: 'hsl(0, 70%, 45%)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, hsl(170, 70%, 50%), hsl(160, 65%, 45%))' }}
          >
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your administrator if you need access
        </p>
      </div>
    </div>
  );
}
