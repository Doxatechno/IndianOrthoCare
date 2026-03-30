import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function TechProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/technician-login" replace />;
  }

  return <div className="min-h-screen bg-background p-4">{children}</div>;
}
