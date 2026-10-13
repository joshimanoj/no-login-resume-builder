import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const PAGE_WIDTH = 794; // A4 at 96dpi

/**
 * Shows children at a fixed A4 width, scaled down to fit the available width,
 * or at a fixed `zoom` (1 = actual size). The scaling lives on wrappers outside
 * #resume-preview so PDF export (which serialises that element) is unaffected.
 */
export const ScaledPreview = ({ children, zoom }: { children: ReactNode; zoom?: number }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      setScale(zoom ?? Math.min(1, outer.clientWidth / PAGE_WIDTH));
      setInnerHeight(inner.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [zoom]);

  return (
    <div
      ref={outerRef}
      className="overflow-hidden"
      style={{ width: zoom ? PAGE_WIDTH * zoom : "100%", height: innerHeight * scale || undefined }}
    >
      <div
        ref={innerRef}
        style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
};
