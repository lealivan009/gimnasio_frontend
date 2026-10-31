import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!message) {
      return;
    }
    const handle = window.setTimeout(() => closeRef.current(), 2500);
    return () => window.clearTimeout(handle);
  }, [message]);

  if (!message) {
    return null;
  }

  return createPortal(
    <div className="toast" role="status">
      {message}
    </div>,
    document.body
  );
}
