import { Badge } from '@/components/ui/badge';
import { formatRoleLabel } from '@/lib/role-labels';

export function clinicalRoleLabel(role: string): string {
  return formatRoleLabel(role);
}

export function clinicalActiveBadge(active: boolean) {
  return active ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}

export function clinicalSessionStatusBadge(status: string) {
  if (status === 'Verified') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
  }
  if (status === 'Submitted') {
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}
