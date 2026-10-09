import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const PAGE_WIDTH = 794; // A4 at 96dpi

/**
 * Shows children at a fixed A4 width, scaled down to fit the available width.
 * The scaling lives on wrappers outside #resume-preview so PDF export (which
 * serialises that element) is unaffected.
 */
export const ScaledPreview = ({ children }: { children: ReactNode }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      setScale(Math.min(1, outer.clientWidth / PAGE_WIDTH));
      setInnerHeight(inner.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden" style={{ height: innerHeight * scale || undefined }}>
      <div
        ref={innerRef}
        style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
};
