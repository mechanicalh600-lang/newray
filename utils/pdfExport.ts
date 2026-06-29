/** Lazy-loaded PDF export (bundled — no CDN, works on internal network). */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: { scale?: number; useCors?: boolean }
) {
  const html2pdf = (await import('html2pdf.js')).default;
  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: options?.scale ?? 2, useCORS: options?.useCors ?? false },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  };
  await html2pdf().set(opt).from(element).save();
}

export async function elementToPdfBlob(
  element: HTMLElement,
  filename: string,
  options?: { scale?: number; useCors?: boolean }
): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default;
  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: options?.scale ?? 2, useCORS: options?.useCors ?? false },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  };
  const worker = html2pdf().set(opt).from(element).toPdf();
  return worker.output('blob');
}
