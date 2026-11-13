import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, RotateCcw, Signature, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/lib/api';
import type { AppraisalCriterionRating, AppraisalFormTemplate, HrAppraisalReview } from '@/features/hr/types';
import { ratingFor } from '@/features/hr/appraisal-form-utils';
import { hrAppraisalService } from '@/services/hr-appraisal.service';
import { appraisalStatusBadge } from '@/components/hr/HrBadges';
import { PrintAppraisalButton } from '@/components/hr/AppraisalPrintView';
import { AppraisalReport, ReportBlock } from './AppraisalReport';
import { RatingSelect } from './RatingControls';
import { SignatureCapture, type SignatureCaptureHandle } from './Signature';
import { StaffSearchPicker } from './StaffSearchPicker';

const BEFORE_SUPERVISOR = ['NotStarted', 'SelfPending', 'Overdue', 'SupervisorReview'];
const SELF_STAGES = ['NotStarted', 'SelfPending', 'Overdue'];

/** HR "Detailed Appraisal Review": edit ratings, sign off to the VC, or send the appraisal back. */
export function HrReviewDetail({
  reviewId,
  templates,
  onBack,
  onChanged,
}: {
  reviewId: string;
  templates: AppraisalFormTemplate[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [review, setReview] = useState<HrAppraisalReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ criterionId: string; itemNumber: number } | null>(null);
  const [editValues, setEditValues] = useState<{ self: AppraisalCriterionRating | null; sup: AppraisalCriterionRating | null }>({ self: null, sup: null });
  const [hrComments, setHrComments] = useState('');
  const [hrName, setHrName] = useState(user?.name ?? '');
  const [confirmReturn, setConfirmReturn] = useState<'self' | 'supervisor' | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [changingForm, setChangingForm] = useState(false);
  const [newTemplateId, setNewTemplateId] = useState('');
  const signatureRef = useRef<SignatureCaptureHandle>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    hrAppraisalService
      .getReview(reviewId)
      .then((r) => {
        if (cancelled) return;
        setReview(r);
        setHrComments(r?.hrComments ?? '');
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Could not load the appraisal')));
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  if (!review) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading appraisal…
      </div>
    );
  }

  const withHr = review.statusCode === 'HrReview';
  const update = (next: HrAppraisalReview) => {
    setReview(next);
    onChanged();
  };

  const run = async (action: () => Promise<HrAppraisalReview>, success: string) => {
    setBusy(true);
    try {
      update(await action());
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Action failed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (criterionId: string, itemNumber: number) => {
    setEditValues({
      self: ratingFor(review.responses, criterionId, 'selfRating'),
      sup: ratingFor(review.responses, criterionId, 'supervisorRating'),
    });
    setEditing({ criterionId, itemNumber });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const ok = await run(
      () => hrAppraisalService.hrEditRating(review.id, editing.criterionId, { selfRating: editValues.self, supervisorRating: editValues.sup }),
      'Rating updated'
    );
    if (ok) setEditing(null);
  };

  const signOff = async () => {
    if (hrName.trim().length < 2) {
      toast.error('Enter the HR name');
      return;
    }
    const sig = signatureRef.current?.read();
    if (!sig || 'error' in sig) {
      toast.error(sig && 'error' in sig ? sig.error : 'Please sign');
      return;
    }
    await run(
      () => hrAppraisalService.hrSign(review.id, { hrComments: hrComments.trim(), signerName: hrName.trim(), ...sig }),
      'Signed and forwarded to the Vice Chancellor'
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="mt-2 text-xl font-bold">Detailed Appraisal Review — {review.employeeName}</h2>
          <p className="text-sm text-gray-500">
            {review.cycleName} · {review.formTemplateName} · Supervisor: {review.supervisorName ?? 'not assigned'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {appraisalStatusBadge(review.status)}
          <PrintAppraisalButton targetRef={reportRef} review={review} />
        </div>
      </div>

      {BEFORE_SUPERVISOR.includes(review.statusCode) ? (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-gray-50 p-3 text-sm">
          <span className="self-center text-gray-600">
            {review.supervisorName ? `Supervisor: ${review.supervisorName}` : 'No supervisor assigned yet.'}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => setAssigning(true)} disabled={busy}>
            <UserCog className="h-4 w-4 mr-1" /> {review.supervisorName ? 'Change supervisor' : 'Assign supervisor'}
          </Button>
          {SELF_STAGES.includes(review.statusCode) ? (
            <Button size="sm" variant="outline" onClick={() => setChangingForm(true)} disabled={busy}>
              Change form
            </Button>
          ) : null}
        </div>
      ) : null}

      <div ref={reportRef}>
        <AppraisalReport review={review} onEditRating={withHr ? openEdit : undefined} showHeader />
      </div>

      {withHr ? (
        <ReportBlock title="HR Sign Off">
          <div className="space-y-4">
            <div>
              <Label htmlFor="hr-comments">Comments</Label>
              <Textarea id="hr-comments" className="mt-1" rows={4} value={hrComments} onChange={(e) => setHrComments(e.target.value)} disabled={busy} />
            </div>
            <div className="sm:max-w-sm">
              <Label htmlFor="hr-name">HR Name</Label>
              <Input id="hr-name" className="mt-1" value={hrName} onChange={(e) => setHrName(e.target.value)} disabled={busy} />
            </div>
            <SignatureCapture ref={signatureRef} disabled={busy} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmReturn('supervisor')} disabled={busy}>
                <RotateCcw className="h-4 w-4 mr-1" /> Return to supervisor
              </Button>
              <Button variant="outline" onClick={() => setConfirmReturn('self')} disabled={busy}>
                <RotateCcw className="h-4 w-4 mr-1" /> Return to staff
              </Button>
              <Button onClick={signOff} disabled={busy}>
                <Signature className="h-4 w-4 mr-1" /> Sign &amp; Submit to VC
              </Button>
            </div>
          </div>
        </ReportBlock>
      ) : review.statusCode === 'SupervisorReview' ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setConfirmReturn('self')} disabled={busy}>
            <RotateCcw className="h-4 w-4 mr-1" /> Return to staff
          </Button>
        </div>
      ) : null}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rating — Item #{editing?.itemNumber}</DialogTitle>
            <DialogDescription>Changes are recorded against your name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Self Rating</Label>
              <div className="mt-1">
                <RatingSelect label="Self rating" value={editValues.self} onChange={(v) => setEditValues((p) => ({ ...p, self: v }))} />
              </div>
            </div>
            <div>
              <Label>Supervisor Rating</Label>
              <div className="mt-1">
                <RatingSelect label="Supervisor rating" value={editValues.sup} onChange={(v) => setEditValues((p) => ({ ...p, sup: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={busy}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assigning} onOpenChange={setAssigning}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{review.supervisorName ? 'Change supervisor' : 'Assign supervisor'}</DialogTitle>
            <DialogDescription>
              For this appraisal only. To change the reporting line permanently, update the organisation chart.
            </DialogDescription>
          </DialogHeader>
          <StaffSearchPicker
            excludeIds={[review.employeeId]}
            onPick={async (staff) => {
              const ok = await run(() => hrAppraisalService.assignSupervisor(review.id, staff.id), 'Supervisor updated');
              if (ok) setAssigning(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={changingForm} onOpenChange={setChangingForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change appraisal form</DialogTitle>
            <DialogDescription>Any ratings already entered on the current form are cleared.</DialogDescription>
          </DialogHeader>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={newTemplateId}
            onChange={(e) => setNewTemplateId(e.target.value)}
          >
            <option value="">— Select form —</option>
            {templates
              .filter((t) => t.id !== review.formTemplateId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangingForm(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newTemplateId || busy}
              onClick={async () => {
                const ok = await run(() => hrAppraisalService.changeTemplate(review.id, newTemplateId), 'Form changed');
                if (ok) setChangingForm(false);
              }}
            >
              Change form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmReturn} onOpenChange={(open) => !open && setConfirmReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Return to {confirmReturn === 'self' ? review.employeeName : 'the supervisor'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmReturn === 'self'
                ? 'The staff member can change their self-assessment and must sign again. The supervisor will then rate again.'
                : 'The supervisor can change their rating and must sign again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const to = confirmReturn;
                setConfirmReturn(null);
                if (to) void run(() => hrAppraisalService.returnReview(review.id, to), 'Appraisal returned');
              }}
            >
              Return appraisal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
