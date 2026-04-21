import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Heart, LogIn, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const { signIn, user, isAdmin, isTechnician, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
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
    // redirect handled by useEffect once role loads
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(160deg, hsl(260, 60%, 30%) 0%, hsl(240, 50%, 20%) 100%)' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10 mb-4">
            <Heart className="w-7 h-7 text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display">Doxa CareX</h1>
          <p className="text-white/50 text-xs mt-1 uppercase tracking-[0.2em]">Admin Portal</p>
        </div>

        <div className="bg-white rounded-3xl px-6 py-8 shadow-2xl">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Sign in to continue</h2>
          <p className="text-sm text-gray-400 mb-6">Use your admin credentials</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
              <input
                type="email"
                className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                placeholder="admin@example.com"
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent pr-12 transition-all"
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
              <div className="rounded-xl px-4 py-3 text-xs font-medium" style={{ background: 'hsl(0, 80%, 95%)', color: 'hsl(0, 70%, 45%)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, hsl(260, 60%, 50%), hsl(240, 60%, 40%))' }}
            >
              <LogIn size={18} />
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Are you a technician? <a href="/technician-login" className="text-purple-600 font-semibold hover:underline">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
