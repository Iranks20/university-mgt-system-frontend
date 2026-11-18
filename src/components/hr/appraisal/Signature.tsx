import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import SignaturePad, { type SignaturePadHandle } from '@/components/SignaturePad';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hrAppraisalService } from '@/services/hr-appraisal.service';
import type { AppraisalSignoffStage } from '@/features/hr/types';
import { todayIso } from '@/features/hr/appraisal-form-utils';

/** Loads a stored signature through the authorised API and shows it. */
export function SignatureImage({ reviewId, stage }: { reviewId: string; stage: AppraisalSignoffStage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    hrAppraisalService
      .fetchSignatureBlob(reviewId, stage)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reviewId, stage]);

  if (failed) return <em className="text-xs text-gray-400">Signature unavailable</em>;
  if (!url) return <span className="text-xs text-gray-400">Loading signature…</span>;
  return <img src={url} alt="Signature" className="h-16 max-w-[220px] rounded border bg-white object-contain p-1" />;
}

export type SignatureCaptureHandle = {
  /** Returns the signature and date, or an error message to show. */
  read: () => { signature: string; signedOn: string } | { error: string };
  clear: () => void;
};

/** Signature box plus date, as at every sign-off in the previous system. */
export const SignatureCapture = forwardRef<SignatureCaptureHandle, { dateLabel?: string; disabled?: boolean }>(
  function SignatureCapture({ dateLabel = 'Date', disabled }, ref) {
    const padRef = useRef<SignaturePadHandle>(null);
    const [signedOn, setSignedOn] = useState(todayIso());
    const dateId = useId();

    useImperativeHandle(ref, () => ({
      read: () => {
        if (!padRef.current || padRef.current.isEmpty()) return { error: 'Please sign in the signature box' };
        if (!signedOn) return { error: 'Please enter the date' };
        return { signature: padRef.current.toDataURL(), signedOn };
      },
      clear: () => padRef.current?.clear(),
    }));

    return (
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
          <Label>Signature</Label>
          <div className="mt-1">
            <SignaturePad ref={padRef} height={150} />
          </div>
        </div>
        <div>
          <Label htmlFor={dateId}>{dateLabel}</Label>
          <Input
            id={dateId}
            type="date"
            className="mt-1"
            value={signedOn}
            disabled={disabled}
            onChange={(e) => setSignedOn(e.target.value)}
          />
        </div>
      </div>
    );
  }
);
