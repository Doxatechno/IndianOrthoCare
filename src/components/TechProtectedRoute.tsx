import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function TechProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, hsl(270, 60%, 55%) 0%, hsl(250, 65%, 40%) 50%, hsl(240, 55%, 30%) 100%)' }}>
        <div className="animate-spin w-10 h-10 border-3 border-white/30 border-t-white rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/technician-login" replace />;
  }

  return <>{children}</>;
}
