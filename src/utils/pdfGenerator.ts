// import jsPDF from 'jspdf'; // Commented out - backup
// import html2canvas from 'html2canvas'; // Commented out - backup
import type { ResumeData } from "@/components/ResumeBuilder";
import { revokeLater, triggerFileDownload, type ReadyDownload } from "@/utils/saveFile";

// Function to slice canvas into page-sized pieces
// function sliceCanvas(canvas: HTMLCanvasElement, startYPx: number, endYPx: number): HTMLCanvasElement {
//   const slicedCanvas = document.createElement('canvas');
//   const ctx = slicedCanvas.getContext('2d');
//   
//   if (!ctx) {
//     throw new Error('Could not get canvas context');
//   }
//   
//   slicedCanvas.width = canvas.width;
//   slicedCanvas.height = endYPx - startYPx;
//   
//   ctx.drawImage(canvas, 0, -startYPx, canvas.width, canvas.height);
//   return slicedCanvas;
// }

function getAllCSS(): string {
  const styles = Array.from(document.styleSheets);
  let cssText = '';
  styles.forEach((styleSheet) => {
    try {
      const rules = Array.from(styleSheet.cssRules || styleSheet.rules);
      rules.forEach((rule) => {
        cssText += (rule as CSSRule).cssText + '\n';
      });
    } catch {
      // Skip external stylesheets that might cause CORS issues
    }
  });
  return cssText;
}

/** Build full HTML document for the resume preview element (for PDF or Word). */
export function getResumeHtml(elementId: string): string {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  <style>
    ${getAllCSS()}
    @import url('https://cdn.tailwindcss.com');
    body { background-color: white !important; padding: 0 !important; min-height: 100vh !important; }
    #resume-preview { background-color: white !important; min-height: 100vh !important; }
    .bg-white { background-color: white !important; }
    @media print {
      body, #resume-preview { background-color: white !important; min-height: 100vh !important; }
      @page { margin-top: 12mm !important; margin-bottom: 12mm !important; margin-left: 10px !important; margin-right: 10px !important; }
      @page :first { margin-top: 3mm !important; margin-bottom: 12mm !important; margin-left: 10px !important; margin-right: 10px !important; }
    }
  </style>
</head>
<body>
  ${element.outerHTML}
</body>
</html>
`;
}

/** Keep the blob url alive and also click it once for desktop. Phones get the same url as a tap target. */
export function publishDownload(blob: Blob, filename: string, contentType: string | null): ReadyDownload {
  if (blob.size === 0) throw new Error("Empty file");
  if (contentType?.includes("application/json")) throw new Error("Server returned an error instead of a file");
  const url = URL.createObjectURL(blob);
  triggerFileDownload(url, filename);
  revokeLater(url);
  return { url, filename };
}

export const generatePDF = async (elementId: string, filename: string = 'resume.pdf'): Promise<ReadyDownload> => {
  try {
    const previewOnlyElements = document.querySelectorAll('.preview-only');
    const originalDisplays: string[] = [];
    previewOnlyElements.forEach((el) => {
      originalDisplays.push((el as HTMLElement).style.display);
      (el as HTMLElement).style.display = 'none';
    });
    const html = getResumeHtml(elementId);
    previewOnlyElements.forEach((el, index) => {
      (el as HTMLElement).style.display = originalDisplays[index];
    });
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return publishDownload(blob, filename, response.headers.get("content-type"));
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateWord = async (
  resumeData: ResumeData,
  template: string,
  filename: string = "resume.docx"
): Promise<ReadyDownload> => {
  try {
    const response = await fetch("/api/generate-docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeData, template }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return publishDownload(blob, filename, response.headers.get("content-type"));
  } catch (error) {
    console.error("Error generating Word document:", error);
    throw error;
  }
};