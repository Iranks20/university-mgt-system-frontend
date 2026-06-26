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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { saveAppraisalTemplate } from '@/features/hr/hr-appraisal-store';
import type { AppraisalFormCriterion, AppraisalFormSection, AppraisalFormTemplate } from '@/features/hr/types';

type HrTemplateEditorDialogProps = {
  open: boolean;
  template: AppraisalFormTemplate | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function newCriterion(sectionId: string, index: number): AppraisalFormCriterion {
  return {
    id: `${sectionId}-c${index}`,
    title: 'New KPI',
    targetPrompt: 'Performance target',
    meansOfVerification: 'Evidence source',
    weight: 3,
  };
}

export function HrTemplateEditorDialog({
  open,
  template,
  onOpenChange,
  onSaved,
}: HrTemplateEditorDialogProps) {
  const [draft, setDraft] = useState<AppraisalFormTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && template) {
      setDraft(JSON.parse(JSON.stringify(template)) as AppraisalFormTemplate);
    }
  }, [open, template]);

  if (!draft) return null;

  const sections = draft.sections ?? [];

  const updateSection = (sectionId: string, patch: Partial<AppraisalFormSection>) => {
    setDraft({
      ...draft,
      sections: sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    });
  };

  const updateCriterion = (
    sectionId: string,
    criterionId: string,
    patch: Partial<AppraisalFormCriterion>
  ) => {
    setDraft({
      ...draft,
      sections: sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              criteria: section.criteria.map((criterion) =>
                criterion.id === criterionId ? { ...criterion, ...patch } : criterion
              ),
            }
          : section
      ),
    });
  };

  const addCriterion = (sectionId: string) => {
    const section = sections.find((row) => row.id === sectionId);
    if (!section || section.kind !== 'kpi') return;
    const criterion = newCriterion(sectionId, section.criteria.length + 1);
    updateSection(sectionId, { criteria: [...section.criteria, criterion] });
  };

  const removeCriterion = (sectionId: string, criterionId: string) => {
    const section = sections.find((row) => row.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      criteria: section.criteria.filter((criterion) => criterion.id !== criterionId),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAppraisalTemplate(draft, draft.id);
      toast.success('Appraisal template updated');
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit appraisal template</DialogTitle>
          <DialogDescription>
            {draft.code} · Changes apply to new cycles; in-flight reviews keep their snapshot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Template name</Label>
              <Input
                className="mt-1"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input className="mt-1" value={draft.code} disabled />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Intended for</Label>
            <Input
              className="mt-1"
              value={draft.intendedFor}
              onChange={(e) => setDraft({ ...draft, intendedFor: e.target.value })}
            />
          </div>

          {sections.map((section) => (
            <div key={section.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{section.title}</p>
                  <Badge variant="outline" className="mt-1">{section.kind}</Badge>
                </div>
                {section.kind === 'kpi' ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => addCriterion(section.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Add KPI
                  </Button>
                ) : null}
              </div>

              {section.kind === 'kpi' ? (
                <div className="space-y-3">
                  {section.criteria.map((criterion) => (
                    <div key={criterion.id} className="rounded border p-3 space-y-2">
                      <div className="flex justify-between gap-2">
                        <Input
                          value={criterion.title}
                          onChange={(e) =>
                            updateCriterion(section.id, criterion.id, { title: e.target.value })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCriterion(section.id, criterion.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        value={criterion.targetPrompt}
                        onChange={(e) =>
                          updateCriterion(section.id, criterion.id, { targetPrompt: e.target.value })
                        }
                        placeholder="Performance target"
                      />
                      <Input
                        value={criterion.meansOfVerification ?? ''}
                        onChange={(e) =>
                          updateCriterion(section.id, criterion.id, {
                            meansOfVerification: e.target.value,
                          })
                        }
                        placeholder="Means of verification"
                      />
                      <div className="max-w-[120px]">
                        <Label>Weight</Label>
                        <Input
                          type="number"
                          min={1}
                          value={criterion.weight}
                          onChange={(e) =>
                            updateCriterion(section.id, criterion.id, {
                              weight: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="list-disc pl-5 text-gray-600">
                  {section.criteria.map((criterion) => (
                    <li key={criterion.id}>{criterion.title}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
