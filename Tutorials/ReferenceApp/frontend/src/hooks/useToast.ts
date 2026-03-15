import { useState, useCallback } from 'react';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let nextId = 0;

/**
 * Toast notification state manager.
 *
 * Call `addToast(message, type)` to show a transient notification.
 * Toasts auto-dismiss after 6 seconds. Render via the Toast component.
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId++;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(toast => toast.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(t => t.filter(toast => toast.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
