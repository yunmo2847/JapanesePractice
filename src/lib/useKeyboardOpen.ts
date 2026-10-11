import { useEffect, useState } from 'react';

/** True while the on-screen keyboard takes a big part of the screen (touch devices). */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let tallest = vv.height;
    let width = vv.width;
    const check = () => {
      if (vv.width !== width) {
        // Rotated (or split view resized): start measuring again.
        width = vv.width;
        tallest = vv.height;
      }
      tallest = Math.max(tallest, vv.height);
      setOpen(vv.height < tallest * 0.75);
    };
    vv.addEventListener('resize', check);
    return () => vv.removeEventListener('resize', check);
  }, []);
  return open;
}
