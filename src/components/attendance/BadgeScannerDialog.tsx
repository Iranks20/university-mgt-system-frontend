import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { CameraOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
};

function cameraErrorMessage(error: unknown): string {
  const text = String((error as { name?: string; message?: string })?.name ?? error ?? '');
  if (!window.isSecureContext) {
    return 'The camera only works when the system is opened over HTTPS (or on localhost). Use search or a handheld scanner instead.';
  }
  if (/NotAllowed|Permission/i.test(text)) {
    return 'Camera permission was refused. Allow camera access for this site in the browser settings.';
  }
  if (/NotFound|Camera not found/i.test(text)) {
    return 'No camera was found on this device.';
  }
  return 'The camera could not be started. Close other apps using the camera and try again.';
}

export function BadgeScannerDialog({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let scanner: QrScanner | null = null;
    let handled = false;
    let cancelled = false;

    const start = async () => {
      const video = videoRef.current;
      if (!video || cancelled) return;
      scanner = new QrScanner(
        video,
        (result) => {
          if (handled) return;
          handled = true;
          onDetectedRef.current(result.data);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        }
      );
      try {
        await scanner.start();
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    };

    const frame = requestAnimationFrame(() => void start());
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan attendance badge</DialogTitle>
          <DialogDescription>Hold the QR code on the staff badge inside the frame.</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center text-sm text-gray-600">
            <CameraOff className="h-8 w-8 text-gray-400" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
          </div>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
