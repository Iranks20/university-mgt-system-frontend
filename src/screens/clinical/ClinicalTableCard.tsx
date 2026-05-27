import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ClinicalTableCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  total?: number;
  loading?: boolean;
};

export function ClinicalTableCard({ title, description, action, children, total, loading }: ClinicalTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
          </div>
        ) : (
          <div className="rounded-md border">
            {children}
            {total != null ? (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{total} total</span>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
