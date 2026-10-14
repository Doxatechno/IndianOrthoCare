import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Landing page for the link in a password-reset email. Supabase puts the user
 * into a short-lived recovery session, which is what lets updateUser set a new
 * password. Previously there was no reset path at all: a technician who forgot
 * their password had no route back in and an administrator had to intervene in
 * the Supabase console.
 */
export default function ResetPassword() {
  const { completePasswordReset } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // The recovery session arrives either already restored or via the
    // PASSWORD_RECOVERY event, depending on how the link was opened.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setSubmitting(true);
    const { error: err } = await completePasswordReset(password);
    setSubmitting(false);
    if (err) { setError(err); return; }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            {done ? <CheckCircle2 className="text-success" size={20} /> : <KeyRound className="text-primary" size={20} />}
          </div>
          <h1 className="text-xl font-bold text-foreground font-display">
            {done ? 'Password updated' : 'Choose a new password'}
          </h1>
          {!done && !ready && (
            <p className="text-sm text-muted-foreground">
              This link is invalid or has expired. Request a new one from the sign-in page.
            </p>
          )}
        </div>

        {done ? (
          <Button className="w-full rounded-xl h-11" onClick={() => navigate('/login', { replace: true })}>
            Go to sign in
          </Button>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">New password</Label>
              <Input type="password" className="mt-1.5 rounded-xl" value={password} autoComplete="new-password"
                onChange={e => setPassword(e.target.value)} disabled={!ready} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Confirm new password</Label>
              <Input type="password" className="mt-1.5 rounded-xl" value={confirm} autoComplete="new-password"
                onChange={e => setConfirm(e.target.value)} disabled={!ready} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={!ready || submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
