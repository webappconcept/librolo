"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: string;
  side?: TooltipSide;
  delay?: number;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}

/**
 * Tooltip riutilizzabile per tutta l'amministrazione.
 *
 * Uso:
 *   <Tooltip label="Modifica pagina">
 *     <button ...>...</button>
 *   </Tooltip>
 *
 * Props:
 *   label   - testo del tooltip
 *   side    - posizione: "top" (default) | "bottom" | "left" | "right"
 *   delay   - ms prima che appaia (default 400)
 */
export default function Tooltip({
  label,
  side = "top",
  delay = 400,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function computeCoords(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const gap = 6;
    switch (side) {
      case "top":
        return {
          top: rect.top + window.scrollY - gap,
          left: rect.left + window.scrollX + rect.width / 2,
        };
      case "bottom":
        return {
          top: rect.bottom + window.scrollY + gap,
          left: rect.left + window.scrollX + rect.width / 2,
        };
      case "left":
        return {
          top: rect.top + window.scrollY + rect.height / 2,
          left: rect.left + window.scrollX - gap,
        };
      case "right":
        return {
          top: rect.top + window.scrollY + rect.height / 2,
          left: rect.right + window.scrollX + gap,
        };
    }
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLElement>) {
    const el = e.currentTarget;
    triggerRef.current = el;
    timerRef.current = setTimeout(() => {
      setCoords(computeCoords(el));
      setVisible(true);
    }, delay);
    children.props.onMouseEnter?.(e);
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLElement>) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    children.props.onMouseLeave?.(e);
  }

  function handleFocus(e: React.FocusEvent<HTMLElement>) {
    const el = e.currentTarget;
    triggerRef.current = el;
    setCoords(computeCoords(el));
    setVisible(true);
    children.props.onFocus?.(e as React.FocusEvent<HTMLElement>);
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    setVisible(false);
    children.props.onBlur?.(e as React.FocusEvent<HTMLElement>);
  }

  const transformMap: Record<TooltipSide, string> = {
    top: "translateX(-50%) translateY(-100%)",
    bottom: "translateX(-50%) translateY(0%)",
    left: "translateX(-100%) translateY(-50%)",
    right: "translateX(0%) translateY(-50%)",
  };

  const arrowMap: Record<TooltipSide, React.CSSProperties> = {
    top: {
      bottom: "-4px",
      left: "50%",
      transform: "translateX(-50%) rotate(45deg)",
    },
    bottom: {
      top: "-4px",
      left: "50%",
      transform: "translateX(-50%) rotate(45deg)",
    },
    left: {
      right: "-4px",
      top: "50%",
      transform: "translateY(-50%) rotate(45deg)",
    },
    right: {
      left: "-4px",
      top: "50%",
      transform: "translateY(-50%) rotate(45deg)",
    },
  };

  const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;

  const cloned = (
    <child.type
      {...child.props}
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={child.props["aria-label"] ?? label}
    />
  );

  const tooltip = visible && mounted
    ? createPortal(
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: coords.top,
            left: coords.left,
            transform: transformMap[side],
            zIndex: 9999,
            pointerEvents: "none",
            // fade in
            opacity: visible ? 1 : 0,
            transition: "opacity 120ms ease",
          }}
        >
          <div
            style={{
              position: "relative",
              background: "var(--admin-tooltip-bg, #1a1917)",
              color: "var(--admin-tooltip-text, #e8e6e3)",
              fontSize: "11px",
              fontWeight: 500,
              lineHeight: 1.4,
              padding: "4px 8px",
              borderRadius: "6px",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {label}
            {/* Arrow */}
            <span
              style={{
                position: "absolute",
                width: "7px",
                height: "7px",
                background: "var(--admin-tooltip-bg, #1a1917)",
                border: "1px solid rgba(255,255,255,0.07)",
                ...arrowMap[side],
              }}
            />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {cloned}
      {tooltip}
    </>
  );
}
