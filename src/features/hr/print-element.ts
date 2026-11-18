/**
 * Prints one element on its own: copies it, with the page's stylesheets, into a hidden iframe and
 * prints that. The browser's print dialog offers "Save as PDF". Blob image URLs (signatures) stay
 * valid because the iframe shares the page's origin.
 */
export function printElement(element: HTMLElement, title: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>${styles}
<style>@page { size: A4; margin: 14mm; } body { background: #fff; padding: 0; margin: 0; }
.break-inside-avoid { break-inside: avoid; }</style></head><body>${element.outerHTML}</body></html>`);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  const run = () => {
    win.focus();
    win.print();
    cleanup();
  };
  // Give stylesheets and images a moment to load before printing.
  if (doc.readyState === 'complete') setTimeout(run, 400);
  else iframe.onload = () => setTimeout(run, 400);
}
