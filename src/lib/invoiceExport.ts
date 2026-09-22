import jsPDF from 'jspdf';
import { toCanvas, toJpeg, toBlob } from 'html-to-image';

export interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  taxNumber?: string;
  drugLicenseNo?: string;
}

/**
 * Capture an HTML DOM element and return as JPEG Blob
 * Uses html-to-image which natively supports OKLCH, modern CSS, and high DPI.
 */
export async function captureElementAsJPG(element: HTMLElement): Promise<Blob> {
  try {
    const blob = await toBlob(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      type: 'image/jpeg',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
    });

    if (blob) {
      return blob;
    }
  } catch (err) {
    console.warn('html-to-image toBlob direct failed, trying toCanvas fallback:', err);
  }

  // Fallback using toCanvas
  const canvas = await toCanvas(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mimeString }));
          } catch (e) {
            reject(new Error('Canvas toBlob and dataURL conversion failed'));
          }
        }
      },
      'image/jpeg',
      0.95
    );
  });
}

/**
 * Generate PDF from DOM element using html-to-image & jsPDF
 */
export async function captureElementAsPDF(
  element: HTMLElement, 
  filename: string = 'Invoice.pdf',
  isThermal: boolean = false
): Promise<{ blob: Blob; doc: jsPDF }> {
  // Capture canvas using html-to-image (supports oklch, CSS variables, Tailwind v4)
  const canvas = await toCanvas(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    style: {
      transform: 'scale(1)',
      transformOrigin: 'top left',
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  if (isThermal) {
    // Thermal Receipt 80mm format
    const receiptWidth = 80; // mm
    const receiptHeight = Math.max(100, Math.round((canvas.height * receiptWidth) / canvas.width));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [receiptWidth, receiptHeight]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, receiptWidth, receiptHeight, undefined, 'FAST');
    const blob = pdf.output('blob');
    return { blob, doc: pdf };
  } else {
    // Standard A4 format
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const blob = pdf.output('blob');
    return { blob, doc: pdf };
  }
}

/**
 * Trigger browser file download
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Print an HTML element cleanly using an isolated hidden iframe
 */
export function printHtmlElement(
  element: HTMLElement, 
  title: string = 'Invoice Print', 
  isThermal: boolean = false,
  isMonochrome: boolean = false
) {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Check if element or document dictates monochrome or white theme
    const elementThemeAttr = element.getAttribute('data-print-theme') || '';
    const isElementMonochrome = 
      isMonochrome || 
      element.getAttribute('data-monochrome') === 'true' ||
      elementThemeAttr.toLowerCase() === 'white' ||
      elementThemeAttr.toLowerCase() === '#ffffff' ||
      elementThemeAttr.toLowerCase() === '#000000' ||
      elementThemeAttr.toLowerCase() === 'black';

    // Collect all existing stylesheets & tailwind styles
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');

    const printPageCSS = isThermal ? `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        text-shadow: none !important;
        box-shadow: none !important;
        color: #000000 !important;
      }
      html, body {
        margin: 0 !important;
        padding: 1.5mm 2.5mm !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif !important;
        width: 76mm !important;
        max-width: 80mm !important;
      }
      img {
        max-width: 100% !important;
      }
      .no-print, [data-no-print] {
        display: none !important;
      }
      /* Ensure dashed borders print dark and crisp */
      .border-dashed {
        border-style: dashed !important;
        border-color: #000000 !important;
      }
      .border-b, .border-t, .border-l, .border-r, .border {
        border-color: #000000 !important;
      }
    ` : `
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        ${isElementMonochrome ? `
        color: #000000 !important;
        text-shadow: none !important;
        box-shadow: none !important;
        ` : ''}
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        width: 100% !important;
        max-width: 100% !important;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      thead {
        display: table-header-group !important;
      }
      tfoot {
        display: table-footer-group !important;
      }
      img {
        max-width: 100% !important;
      }
      .no-print, [data-no-print] {
        display: none !important;
      }
      /* Remove screen container borders & shadows when printing */
      #invoice-a4-document, .printable-bill-root {
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      ${isElementMonochrome ? `
      /* =========================================================================
         PURE BLACK & WHITE / ZERO-INK PRINTING ENFORCEMENT
         Forces all text, borders, headers and badges to high-contrast monochrome
         ========================================================================= */
      * {
        color: #000000 !important;
        border-color: #000000 !important;
        background-color: transparent !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      html, body, .printable-bill-root {
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      p, span, div, h1, h2, h3, h4, th, td, strong, b, i, a {
        color: #000000 !important;
      }
      table, th, td, tr, div, hr {
        border-color: #000000 !important;
      }
      thead tr {
        background-color: #ffffff !important;
        border-bottom: 2px solid #000000 !important;
      }
      th {
        background-color: #ffffff !important;
        color: #000000 !important;
        font-weight: 800 !important;
      }
      tbody tr {
        background-color: #ffffff !important;
      }
      td {
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      [style*="background-color"], .bg-blue-600, .bg-slate-900, .bg-emerald-600, .bg-indigo-600, .bg-slate-800, [class*="bg-"] {
        background-color: #ffffff !important;
        color: #000000 !important;
        border: 1.5px solid #000000 !important;
      }
      .bg-black, [class*="bg-black"], [class*="text-white"] {
        background-color: #ffffff !important;
        color: #000000 !important;
        border-color: #000000 !important;
      }
      ` : ''}
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          ${styles}
          <style>
            ${printPageCSS}
            * {
              box-sizing: border-box !important;
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print():', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 2000);
      }
    }, 350);
  } catch (e) {
    console.warn('Error in printHtmlElement:', e);
    window.print();
  }
}

/**
 * Native Share or fallback for WhatsApp
 */
export async function shareFileOrFallback(
  fileBlob: Blob, 
  fileName: string, 
  title: string, 
  text: string, 
  phoneNumber?: string
): Promise<{ sharedNatively: boolean }> {
  const file = new File([fileBlob], fileName, { type: fileBlob.type });

  // 1. Try Native Web Share API with Files
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: title,
        text: text
      });
      return { sharedNatively: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { sharedNatively: true }; // User cancelled the share dialog
      }
      console.warn('Native share failed, falling back to download & whatsapp link:', err);
    }
  }

  // 2. Fallback: Download file to device & open WhatsApp with text
  triggerFileDownload(fileBlob, fileName);

  let cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '92' + cleanPhone.slice(1);
  }

  const waText = encodeURIComponent(
    `${text}\n\n📎 *[Attached Invoice: ${fileName} has been downloaded to your device]*`
  );
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${waText}` 
    : `https://wa.me/?text=${waText}`;

  window.open(waUrl, '_blank');
  return { sharedNatively: false };
}
