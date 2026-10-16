import { Copy, Download, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type TemporaryCredential = {
  name: string;
  login: string;
  temporaryPassword: string;
};

type TemporaryCredentialsDialogProps = {
  credentials: TemporaryCredential[];
  onClose: () => void;
  title?: string;
};

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCredentialsCsv(credentials: TemporaryCredential[]) {
  const rows = [
    ['Name', 'Login', 'Temporary password'],
    ...credentials.map((c) => [c.name, c.login, c.temporaryPassword]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `kcu-temporary-passwords-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch {
    toast.error('Could not copy; select and copy manually');
  }
}

export function TemporaryCredentialsDialog({
  credentials,
  onClose,
  title = 'Temporary password issued',
}: TemporaryCredentialsDialogProps) {
  const open = credentials.length > 0;
  const single = credentials.length === 1 ? credentials[0] : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#015F2B]" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Share this privately with the account holder. It is shown only once, and they must choose
            their own password when they first sign in.
          </DialogDescription>
        </DialogHeader>

        {single ? (
          <div className="space-y-3 rounded-md border bg-muted/40 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Account</div>
              <div className="font-medium break-all">{single.name}</div>
              <div className="text-sm text-muted-foreground break-all">{single.login}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <code className="rounded bg-background px-3 py-2 text-lg font-semibold tracking-wide select-all">
                {single.temporaryPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyText(single.temporaryPassword)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Temporary password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((c) => (
                  <TableRow key={`${c.login}-${c.temporaryPassword}`}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="break-all text-muted-foreground">{c.login}</TableCell>
                    <TableCell>
                      <code className="select-all">{c.temporaryPassword}</code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="gap-2">
          {credentials.length > 1 && (
            <Button type="button" variant="outline" onClick={() => downloadCredentialsCsv(credentials)}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          )}
          <Button type="button" className="bg-[#015F2B] hover:bg-[#014022]" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
