import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isTechnician, loading } = useAuth();

  // If the session never resolves - the backend is unreachable, or a request is
  // hanging - the guard used to render a spinner forever and the page looked
  // blank with no message and no way out.
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!loading) { setStalled(false); return; }
    const timer = setTimeout(() => setStalled(true), 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    if (stalled) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-lg font-bold text-foreground">Can't reach the server</h1>
            <p className="text-sm text-muted-foreground">
              We couldn't confirm your sign-in. Check your connection and try again.
              If this keeps happening, the service may be down.
            </p>
            <Button className="rounded-xl" onClick={() => window.location.reload()}>Try again</Button>
          </div>
        </div>
      );
    }
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
