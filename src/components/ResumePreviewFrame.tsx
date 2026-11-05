import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  RESUME_PAPER_WIDTH_PX,
  previewScale,
  scaledPreviewHeight,
  shouldScalePreview,
} from "@/utils/previewScale";

/**
 * Lays the preview out at page width, then shrinks it to the card.
 * The scale wrapper sits outside #resume-preview so PDF and Word HTML stay unscaled.
 */
export function ResumePreviewFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    const paper = paperRef.current;
    if (!frame || !paper) return;

    const measure = () => {
      const available = frame.clientWidth;
      const nextScale = shouldScalePreview(available) ? previewScale(available) : 1;
      const nextHeight = nextScale < 1 ? scaledPreviewHeight(paper.scrollHeight, nextScale) : 0;
      setScale((prev) => (Math.abs(prev - nextScale) < 0.001 ? prev : nextScale));
      setFrameHeight((prev) => (Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);

  const scaled = scale < 1;

  return (
    <div
      ref={frameRef}
      data-testid="resume-preview-frame"
      data-preview-scale={scale}
      className="w-full min-w-0 max-w-full overflow-hidden"
      style={scaled ? { height: frameHeight } : undefined}
    >
      <div
        ref={paperRef}
        style={
          scaled
            ? {
                width: RESUME_PAPER_WIDTH_PX,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
