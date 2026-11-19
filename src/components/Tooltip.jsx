import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ children, text, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: position });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    const padding = 12;

    let placement = position;

    // Flip vertically if clipped at top or bottom of the viewport
    if (placement === 'top' && triggerRect.top - tipRect.height - gap < padding) {
      placement = 'bottom';
    } else if (
      placement === 'bottom' &&
      triggerRect.bottom + tipRect.height + gap > window.innerHeight - padding
    ) {
      placement = 'top';
    }

    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = triggerRect.bottom + gap;
      left = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2;
    } else if (placement === 'left') {
      top = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2;
      left = triggerRect.left - tipRect.width - gap;
    } else if (placement === 'right') {
      top = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2;
      left = triggerRect.right + gap;
    } else {
      // Default: 'top'
      top = triggerRect.top - tipRect.height - gap;
      left = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2;
    }

    // Clamp horizontally and vertically inside the browser viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tipRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tipRect.height - padding));

    setCoords({ top, left, placement });
  }, [position]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [visible, updatePosition]);

  if (!text) return children;

  return (
    <span
      ref={triggerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      className="inline-flex items-center"
    >
      {children}
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className="pointer-events-none max-w-xs px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium leading-snug shadow-lg whitespace-normal text-center"
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}
