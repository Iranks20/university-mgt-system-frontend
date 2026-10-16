import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EDITABLE_UNIT_TYPES,
  type OrgUnitNode,
  type UnitInput,
} from '@/services/organization.service';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: OrgUnitNode[];
  editing: OrgUnitNode | null;
  defaultParentId: string | null;
  onSubmit: (input: UnitInput) => Promise<void>;
};

const ROOT_VALUE = '__root';

function descendantIds(units: OrgUnitNode[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const u of units) {
      if (u.parentId && ids.has(u.parentId) && !ids.has(u.id)) {
        ids.add(u.id);
        added = true;
      }
    }
  }
  return ids;
}

export function OrgUnitDialog({ open, onOpenChange, units, editing, defaultParentId, onSubmit }: Props) {
  const isSchoolNode = editing?.unitType === 'School' || editing?.unitType === 'SchoolGroup';
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState<UnitInput['unitType']>('Office');
  const [parentId, setParentId] = useState('');
  const [headTitle, setHeadTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isOnChart, setIsOnChart] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setUnitType(
      editing && editing.unitType !== 'School' && editing.unitType !== 'SchoolGroup'
        ? editing.unitType
        : 'Office'
    );
    setParentId(editing ? (editing.parentId ?? '') : (defaultParentId ?? ''));
    setHeadTitle(editing?.headTitle ?? '');
    setDescription(editing?.description ?? '');
    setIsActive(editing?.isActive ?? true);
    setIsOnChart(editing?.isOnChart ?? true);
    setError('');
  }, [open, editing, defaultParentId]);

  const parentOptions = useMemo(() => {
    const blocked = editing ? descendantIds(units, editing.id) : new Set<string>();
    return units
      .filter((u) => !blocked.has(u.id) && u.unitType !== 'SchoolGroup')
      .map((u) => ({ value: u.id, label: u.name }));
  }, [units, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the unit a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        unitType,
        parentId: parentId || null,
        headTitle: headTitle.trim() || null,
        description: description.trim() || null,
        isActive,
        isOnChart,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the unit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add organisation unit'}</DialogTitle>
          <DialogDescription>
            {isSchoolNode
              ? 'Schools are managed from the Academic Structure. You can update the head title and description here.'
              : 'Offices, directorates, departments, units and single posts all sit in one tree.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Procurement Unit"
              disabled={isSchoolNode}
            />
          </div>
          {!isSchoolNode && (
            <div className="space-y-1.5">
              <LabelWithInfo info="Use Post for a single position that reports to an office, such as Accountant or Assistant Librarian. Use Unit for small teams inside a directorate.">
                Type
              </LabelWithInfo>
              <Select value={unitType} onValueChange={(v) => setUnitType(v as UnitInput['unitType'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDITABLE_UNIT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isSchoolNode && (
            <div className="space-y-1.5">
              <LabelWithInfo info="The office this unit reports to. Changing it moves the unit, with everything under it, to a new place on the chart.">
                Reports to
              </LabelWithInfo>
              <Combobox
                options={[{ value: ROOT_VALUE, label: 'Top of the chart' }, ...parentOptions]}
                value={parentId || ROOT_VALUE}
                onValueChange={(v) => setParentId(v === ROOT_VALUE ? '' : v)}
                placeholder="Select parent unit"
                searchPlaceholder="Search units..."
                initialDisplayCount={200}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <LabelWithInfo info="The title of the person who leads this unit, e.g. Vice Chancellor, Director Finance, Dean. Leave blank for bodies without a single head, such as a council.">
              Head title
            </LabelWithInfo>
            <Input
              value={headTitle}
              onChange={(e) => setHeadTitle(e.target.value)}
              placeholder="e.g. Director Finance"
              maxLength={150}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this unit is responsible for"
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="org-unit-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="org-unit-active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="org-unit-on-chart" checked={isOnChart} onCheckedChange={setIsOnChart} />
              <LabelWithInfo
                htmlFor="org-unit-on-chart"
                info="Turn off for working units that exist in practice but are not on the approved organogram. They still hold staff and appear here, marked Off chart."
              >
                Show on printed chart
              </LabelWithInfo>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
