import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { UNIVERSITY_NAME } from '@/lib/institution';
import type { BadgeInfo } from '@/services/staff-attendance.service';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badgeQrSvg(code: string): string {
  return renderToStaticMarkup(
    createElement(QRCodeSVG, { value: code, size: 132, level: 'M', marginSize: 1 })
  );
}

function buildBadgeHtml(badge: BadgeInfo): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Attendance badge – ${escapeHtml(badge.employeeName)}</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
    .badge { width: 85.6mm; height: 54mm; border: 1px dashed #999; border-radius: 3mm; padding: 3mm;
      display: flex; flex-direction: column; }
    .brand { font-size: 10pt; font-weight: bold; color: #015F2B; border-bottom: 2px solid #015F2B; padding-bottom: 1mm; }
    .body { flex: 1; display: flex; gap: 3mm; align-items: center; }
    .qr svg { width: 32mm; height: 32mm; display: block; }
    .info { min-width: 0; }
    .name { font-size: 11pt; font-weight: bold; line-height: 1.2; }
    .number { font-size: 10pt; margin-top: 1mm; font-family: 'Courier New', monospace; }
    .title, .unit { font-size: 8pt; color: #444; margin-top: 1mm; line-height: 1.2; }
    .footer { font-size: 7pt; color: #666; text-align: right; }
  </style>
</head>
<body>
  <div class="badge">
    <div class="brand">${escapeHtml(UNIVERSITY_NAME)}</div>
    <div class="body">
      <div class="qr">${badgeQrSvg(badge.badgeCode)}</div>
      <div class="info">
        <div class="name">${escapeHtml(badge.employeeName)}</div>
        <div class="number">${escapeHtml(badge.staffNumber)}</div>
        <div class="title">${escapeHtml(badge.jobTitle || '')}</div>
        <div class="unit">${escapeHtml(badge.worksIn || '')}</div>
      </div>
    </div>
    <div class="footer">Staff attendance badge</div>
  </div>
</body>
</html>`;
}

function removePrintFrame(iframe: HTMLIFrameElement): void {
  if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
}

export function printStaffBadge(badge: BadgeInfo): void {
  const html = buildBadgeHtml(badge);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    removePrintFrame(iframe);
    throw new Error('Could not prepare print view');
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    const cleanup = () => removePrintFrame(iframe);
    frameWindow.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 60_000);
  };

  if (frameDocument.readyState === 'complete') {
    requestAnimationFrame(triggerPrint);
    return;
  }
  iframe.onload = () => requestAnimationFrame(triggerPrint);
}
