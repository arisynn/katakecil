import { useEffect, useRef } from 'react';

let scrollLocks=0;
let originalOverflow='';

/** Keep keyboard focus inside Reader drawers and return it on dismissal. */
export function useReaderDialogFocus<T extends HTMLElement>(onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if(scrollLocks++===0){originalOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
    ) ?? []).filter(element => element.getClientRects().length > 0);
    const initial = dialogRef.current?.querySelector<HTMLElement>('[data-reader-autofocus]') ?? focusable()[0];
    initial?.focus({preventScroll:true});
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const available = focusable();
      if (!available.length) return;
      const first = available[0];
      const last = available[available.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey);if(--scrollLocks===0)document.body.style.overflow=originalOverflow; previous?.focus({preventScroll:true}); };
  }, []);

  return dialogRef;
}
