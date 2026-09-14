import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicService } from '@/services/academic.service';
import { getApiErrorMessage } from '@/lib/api';

export type ProgramStreamRow = {
  id: string;
  programId: string;
  code: string;
  name: string;
  minYear: number | null;
  isActive: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: { id: string; name: string; code: string; duration?: number } | null;
};

export function ProgramStreamsDialog({ open, onOpenChange, program }: Props) {
  const [streams, setStreams] = useState<ProgramStreamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [minYear, setMinYear] = useState('3');

  const load = async () => {
    if (!program?.id) return;
    setLoading(true);
    try {
      const rows = await academicService.getProgramStreams(program.id, { includeInactive: true });
      setStreams(rows);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load streams'));
      setStreams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !program?.id) return;
    setCode('');
    setName('');
    setMinYear('3');
    void load();
  }, [open, program?.id]);

  const handleCreate = async () => {
    if (!program?.id) return;
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSaving(true);
    try {
      await academicService.createProgramStream(program.id, {
        code: code.trim(),
        name: name.trim(),
        minYear: minYear ? parseInt(minYear, 10) : null,
        isActive: true,
      });
      setCode('');
      setName('');
      toast.success('Stream created');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create stream'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (stream: ProgramStreamRow) => {
    try {
      await academicService.updateProgramStream(stream.id, { isActive: !stream.isActive });
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update stream'));
    }
  };

  const handleDelete = async (stream: ProgramStreamRow) => {
    if (!confirm(`Remove stream "${stream.name}"? Linked records will keep history; the stream is deactivated if still in use.`)) {
      return;
    }
    try {
      await academicService.deleteProgramStream(stream.id);
      toast.success('Stream removed');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove stream'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Specialization streams</DialogTitle>
          <DialogDescription>
            {program
              ? `Define options under ${program.name} (${program.code}), e.g. Accounting and Procurement from Year 3.`
              : 'Select a program first.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Add stream</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Code</Label>
                <Input className="mt-1" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ACC" />
              </div>
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Accounting" />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[140px]">
                <Label>Starts at year</Label>
                <Select value={minYear} onValueChange={setMinYear}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" className="bg-[#015F2B]" disabled={saving} onClick={handleCreate}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add stream
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading streams…
              </div>
            ) : streams.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No streams yet for this program.</div>
            ) : (
              <ul className="divide-y">
                {streams.map((stream) => (
                  <li key={stream.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {stream.name}{' '}
                        <span className="text-muted-foreground font-normal">({stream.code})</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {stream.minYear ? `From year ${stream.minYear}` : 'No minimum year'}
                        {' · '}
                        {stream.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(stream)}>
                        {stream.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(stream)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
