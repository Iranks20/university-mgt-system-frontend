import { UNIVERSITY_NAME } from '@/lib/institution';
import type { LecturerStatsDetailExport } from '@/utils/excel';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPeriod(detail: LecturerStatsDetailExport): string {
  if (detail.dateFrom && detail.dateTo) {
    return `${detail.dateFrom} to ${detail.dateTo}`;
  }
  return 'All time';
}

function buildLecturerStatsDetailHtml(
  detail: LecturerStatsDetailExport,
  commentLabel: (comment: string) => string
): string {
  const generatedAt = new Date().toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const byCommentRows = Object.entries(detail.summary.byComment)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([comment, count]) =>
        `<tr><td>${escapeHtml(commentLabel(comment))}</td><td class="num">${count}</td></tr>`
    )
    .join('');

  const byClassRows = detail.byClass
    .map(
      (row) =>
        `<tr>
          <td>${escapeHtml(row.className)}</td>
          <td>${escapeHtml(row.courseUnit)}</td>
          <td class="num">${row.taught}</td>
          <td class="num">${row.missedByLecturer}</td>
          <td class="num">${row.total}</td>
        </tr>`
    )
    .join('');

  const recordRows =
    detail.records.length === 0
      ? '<tr><td colspan="9" class="empty">No lecture records found for this period.</td></tr>'
      : detail.records
          .map((row) => {
            const scheduled = [row.timeForStarting, row.timeOutForEnding].filter(Boolean).join(' – ') || '—';
            return `<tr>
              <td>${escapeHtml(row.date || '—')}</td>
              <td>${escapeHtml(row.className)}</td>
              <td>${escapeHtml(row.courseUnit)}</td>
              <td>${escapeHtml(commentLabel(row.comment))}</td>
              <td>${escapeHtml(row.status || '—')}</td>
              <td>${escapeHtml(scheduled)}</td>
              <td>${escapeHtml(row.checkInTime || '—')}</td>
              <td>${escapeHtml(row.checkOutTime || '—')}</td>
              <td>${escapeHtml(row.substituteLecturerName || '—')}</td>
            </tr>`;
          })
          .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Lecturer Performance Details – ${escapeHtml(detail.lecturer.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 24px; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 4px; color: #015F2B; }
    h2 { font-size: 14px; margin: 20px 0 8px; }
    .meta { color: #555; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #ddd; border-radius: 4px; padding: 10px; }
    .card label { display: block; font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
    .card strong { font-size: 13px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat { border: 1px solid #ddd; border-radius: 4px; padding: 10px; text-align: center; }
    .stat label { display: block; font-size: 10px; color: #666; margin-bottom: 4px; }
    .stat strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 11px; }
    td.num { text-align: right; }
    td.empty { text-align: center; color: #666; }
    .note { font-size: 11px; color: #666; margin: 8px 0 16px; }
    @media print {
      body { margin: 12px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(UNIVERSITY_NAME)}</h1>
  <div class="meta">
    <div><strong>Lecturer Performance Details</strong></div>
    <div>${escapeHtml(detail.lecturer.name)} · ${escapeHtml(formatPeriod(detail))}</div>
    <div>Generated: ${escapeHtml(generatedAt)}</div>
  </div>

  <div class="grid">
    <div class="card"><label>Name</label><strong>${escapeHtml(detail.lecturer.name)}</strong></div>
    <div class="card"><label>Staff number</label><strong>${escapeHtml(detail.lecturer.staffNumber || '—')}</strong></div>
    <div class="card"><label>Email</label><strong>${escapeHtml(detail.lecturer.email || '—')}</strong></div>
    <div class="card"><label>School</label><strong>${escapeHtml(detail.lecturer.school)}</strong></div>
    <div class="card"><label>Department</label><strong>${escapeHtml(detail.lecturer.department)}</strong></div>
    <div class="card"><label>Teaching rate</label><strong>${detail.summary.rate.toFixed(1)}%</strong></div>
  </div>

  <div class="stats">
    <div class="stat"><label>Total records</label><strong>${detail.summary.totalRecords}</strong></div>
    <div class="stat"><label>Taught</label><strong>${detail.summary.taught}</strong></div>
    <div class="stat"><label>Missed by lecturer</label><strong>${detail.summary.missedByLecturer}</strong></div>
    <div class="stat"><label>Other outcomes</label><strong>${detail.summary.otherOutcomes}</strong></div>
  </div>

  ${
    detail.summary.rateBasis
      ? `<p class="note">Rate calculation: ${escapeHtml(detail.summary.rateBasis)}. Other outcomes are listed but excluded from the rate denominator.</p>`
      : ''
  }

  ${
    byCommentRows
      ? `<h2>Outcomes breakdown</h2><table><thead><tr><th>Outcome</th><th>Count</th></tr></thead><tbody>${byCommentRows}</tbody></table>`
      : ''
  }

  ${
    detail.byClass.length > 0
      ? `<h2>By class / course unit</h2><table><thead><tr><th>Class</th><th>Course unit</th><th>Taught</th><th>Missed</th><th>Total</th></tr></thead><tbody>${byClassRows}</tbody></table>`
      : ''
  }

  <h2 class="page-break">Lecture records</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Class</th>
        <th>Course unit</th>
        <th>Outcome</th>
        <th>Status</th>
        <th>Scheduled</th>
        <th>Check-in</th>
        <th>Check-out</th>
        <th>Substitute</th>
      </tr>
    </thead>
    <tbody>${recordRows}</tbody>
  </table>
</body>
</html>`;
}

function removePrintFrame(iframe: HTMLIFrameElement): void {
  if (iframe.parentNode) {
    iframe.parentNode.removeChild(iframe);
  }
}

export function printLecturerStatsDetailReport(
  detail: LecturerStatsDetailExport,
  commentLabel: (comment: string) => string
): void {
  const html = buildLecturerStatsDetailHtml(detail, commentLabel);
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
    setTimeout(cleanup, 2000);
  };

  if (frameDocument.readyState === 'complete') {
    requestAnimationFrame(triggerPrint);
    return;
  }

  iframe.onload = () => {
    requestAnimationFrame(triggerPrint);
  };
}
