import type { ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function LabelWithInfo({
  children,
  info,
  htmlFor,
}: {
  children: ReactNode;
  info: string;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            aria-label={`About ${typeof children === 'string' ? children : 'this field'}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
          {info}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
