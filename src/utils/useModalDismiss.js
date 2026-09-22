import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 모달이 열려 있는 동안 ESC로 닫고, Tab 포커스를 모달 내부에 가두고,
// 닫히면 모달을 열기 전 포커스였던 요소로 되돌린다.
export function useModalDismiss(isOpen, onClose) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const container = containerRef.current;

    function getFocusable() {
      return container ? Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
    }

    (getFocusable()[0] ?? container)?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
