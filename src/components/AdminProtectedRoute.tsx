import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isTechnician, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isTechnician && !isAdmin) {
    return <Navigate to="/technician-portal" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            Your account doesn't have admin access. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
