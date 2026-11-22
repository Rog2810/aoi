"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./Dashboard.module.css";

const FADE_PX = 20; // matches the 1.25rem fade in the CSS, so the last letters end up fully visible

/**
 * Text that stays on one line. If it does not fit, the end fades out and the text scrolls sideways while the
 * pointer is over it (or over a parent marked data-marquee-host) or while keyboard focus is inside that parent.
 * Touch screens and reduced-motion users get ordinary wrapping text instead (see Dashboard.module.css).
 * Screen readers always read the full text because it is a single text node.
 */
export default function MarqueeText({ children, className }: { children: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0); // how far the text has to travel; 0 means it fits

  useEffect(() => {
    const b = box.current;
    const t = text.current;
    if (!b || !t) return;
    const measure = () => {
      const over = t.offsetWidth - b.clientWidth;
      setShift(over > 1 ? Math.ceil(over) + FADE_PX : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    return () => ro.disconnect();
  }, [children]);

  const style = shift ? ({ "--shift": `${shift}px`, "--dur": `${Math.max(4, shift / 35 + 2.5)}s` } as CSSProperties) : undefined;
  return (
    <span ref={box} className={[styles.marquee, shift ? styles.marqueeOn : "", className].filter(Boolean).join(" ")} style={style}>
      <span ref={text} className={styles.marqueeText}>{children}</span>
    </span>
  );
}
