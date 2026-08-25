import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ResetFiltersButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function ResetFiltersButton({
  onClick,
  disabled,
  className,
  label = 'Reset filters',
}: ResetFiltersButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn('h-9', className)}
      onClick={onClick}
      disabled={disabled}
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
