import React from 'react';
import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AccessDeniedProps = {
  homePath?: string | null;
};

export default function AccessDenied({ homePath }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
      <ShieldAlert className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold text-gray-900">Access not allowed</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Your account does not have permission to open this page. Use the sidebar or ask an administrator
        to adjust your role permissions.
      </p>
      {homePath ? (
        <Button asChild variant="default">
          <Link to={homePath}>Go to home</Link>
        </Button>
      ) : null}
    </div>
  );
}
