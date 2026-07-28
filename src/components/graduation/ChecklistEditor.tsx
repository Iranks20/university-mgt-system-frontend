import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { GraduationChecklistItem } from '@/features/graduation/types';

type ChecklistEditorProps = {
  items: GraduationChecklistItem[];
  canEdit: boolean;
  onToggle: (itemId: string, done: boolean) => void;
};

export function ChecklistEditor({ items, canEdit, onToggle }: ChecklistEditorProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No checklist items yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 rounded-md border p-3 bg-white">
          <Checkbox
            id={item.id}
            checked={item.done}
            disabled={!canEdit}
            onCheckedChange={(checked) => onToggle(item.id, checked === true)}
          />
          <Label
            htmlFor={item.id}
            className={`text-sm font-normal leading-snug cursor-pointer ${
              item.done ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {item.label}
          </Label>
        </li>
      ))}
    </ul>
  );
}
