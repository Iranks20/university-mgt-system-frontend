import React, { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import kcuUniversityLogo from '@/assets/images/kcu-university-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api, { getApiErrorMessage } from '@/lib/api';
import { useAuth, type SessionPayload } from '@/contexts/AuthContext';
import { PASSWORD_POLICY_SUMMARY, passwordPolicyProblem } from '@/lib/password-policy';

export default function ForcedPasswordChange() {
  const { user, applySession, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordPolicyProblem(newPassword);
    if (problem) {
      setError(problem);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Choose a password different from the temporary one');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const session = await api.post<SessionPayload & { message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      applySession(session);
      toast.success('Password changed. Welcome!');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <img
            src={kcuUniversityLogo}
            alt="King Ceasor University"
            className="mx-auto h-20 w-20 object-contain"
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">King Ceasor University</h1>
        </div>
        <Card className="border-t-4 border-t-[#015F2B] shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="h-5 w-5 text-[#015F2B]" />
              Set a new password
            </CardTitle>
            <CardDescription>
              {user?.name ? `${user.name}, your` : 'Your'} password was issued or reset by an administrator.
              Choose your own password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="forced-password-form">
              <div className="space-y-2">
                <LabelWithInfo
                  htmlFor="forcedCurrentPassword"
                  info="The temporary password you were given by HR or the administrator."
                >
                  Current password
                </LabelWithInfo>
                <Input
                  id="forcedCurrentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <LabelWithInfo htmlFor="forcedNewPassword" info={PASSWORD_POLICY_SUMMARY}>
                  New password
                </LabelWithInfo>
                <Input
                  id="forcedNewPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forcedConfirmPassword">Confirm new password</Label>
                <Input
                  id="forcedConfirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-[#015F2B] hover:bg-[#014022] h-11"
              >
                {saving ? 'Saving…' : 'Save password and continue'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
