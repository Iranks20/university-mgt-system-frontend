import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/api';
import {
  adminService,
  LECTURER_PASSWORD_MIN_LENGTH,
  type LecturerLoginResult,
} from '@/services/admin.service';

export type LecturerLoginTarget = { id: string; name: string; email: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LecturerLoginDialog({
  lecturer,
  onOpenChange,
  onSaved,
  updateLogin = adminService.updateLecturerLogin,
}: {
  lecturer: LecturerLoginTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (result: LecturerLoginResult) => void;
  updateLogin?: (
    staffId: string,
    input: { email?: string; newPassword?: string }
  ) => Promise<LecturerLoginResult>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lecturer) return;
    setEmail(lecturer.email);
    setPassword('');
    setConfirm('');
    setShowPassword(false);
  }, [lecturer]);

  const trimmedEmail = email.trim();
  const emailChanged = Boolean(lecturer) && trimmedEmail.toLowerCase() !== lecturer!.email.toLowerCase();
  const emailError = trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail) ? 'Enter a valid email address' : null;
  const passwordError =
    password && password.length < LECTURER_PASSWORD_MIN_LENGTH
      ? `At least ${LECTURER_PASSWORD_MIN_LENGTH} characters`
      : null;
  const confirmError = password && confirm && password !== confirm ? 'Passwords do not match' : null;
  const hasChanges = emailChanged || Boolean(password);
  const canSave =
    hasChanges &&
    Boolean(trimmedEmail) &&
    !emailError &&
    !passwordError &&
    (!password || password === confirm) &&
    !saving;

  const save = async () => {
    if (!lecturer || !canSave) return;
    setSaving(true);
    try {
      const result = await updateLogin(lecturer.id, {
        ...(emailChanged ? { email: trimmedEmail } : {}),
        ...(password ? { newPassword: password } : {}),
      });
      const changes = [result.emailChanged ? 'email' : null, result.passwordChanged ? 'password' : null]
        .filter(Boolean)
        .join(' and ');
      toast.success(`Login ${changes} updated for ${lecturer.name}`, {
        description: 'They have been signed out and must log in again.',
      });
      onSaved(result);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update the login'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(lecturer)} onOpenChange={(open) => !saving && onOpenChange(open)}>
      <DialogContent className="w-[96vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Edit login</DialogTitle>
          <DialogDescription>{lecturer?.name}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <LabelWithInfo
              htmlFor="lecturer-login-email"
              info="They sign in with this email. Their staff record email changes with it."
            >
              Login email
            </LabelWithInfo>
            <Input
              id="lecturer-login-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(emailError)}
            />
            {emailError && <p className="text-xs text-red-600">{emailError}</p>}
          </div>

          <div className="space-y-1.5">
            <LabelWithInfo
              htmlFor="lecturer-login-password"
              info={`Leave blank to keep the current password. At least ${LECTURER_PASSWORD_MIN_LENGTH} characters. Share it with the lecturer privately.`}
            >
              New password
            </LabelWithInfo>
            <div className="relative">
              <Input
                id="lecturer-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(passwordError)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
          </div>

          {password && (
            <div className="space-y-1.5">
              <LabelWithInfo htmlFor="lecturer-login-confirm" info="Type the new password again.">
                Confirm new password
              </LabelWithInfo>
              <Input
                id="lecturer-login-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={Boolean(confirmError)}
              />
              {confirmError && <p className="text-xs text-red-600">{confirmError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={!canSave}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
