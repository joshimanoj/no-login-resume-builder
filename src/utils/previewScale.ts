/** A4 at 96dpi. The on-screen preview is laid out at this width, then scaled to the card. */
export const RESUME_PAPER_WIDTH_PX = 794;

export function previewScale(availableWidth: number, paperWidth = RESUME_PAPER_WIDTH_PX): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return 1;
  if (!Number.isFinite(paperWidth) || paperWidth <= 0) return 1;
  if (availableWidth >= paperWidth) return 1;
  return availableWidth / paperWidth;
}

/** Shrink when the card is narrower than the page so line breaks stay the same as the PDF. */
export function shouldScalePreview(availableWidth: number): boolean {
  return previewScale(availableWidth) < 1;
}

/** Layout height after `transform: scale`, so the frame does not keep the unscaled gap. */
export function scaledPreviewHeight(contentHeight: number, scale: number): number {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return 0;
  if (!Number.isFinite(scale) || scale <= 0) return 0;
  return contentHeight * scale;
}
