import { type CSSProperties } from 'react';
import type { Toast } from '../hooks/useToast.ts';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            ...toastStyle,
            borderLeft: `4px solid ${
              toast.type === 'success'
                ? 'var(--color-success)'
                : toast.type === 'error'
                  ? 'var(--color-error)'
                  : 'var(--color-accent)'
            }`,
          }}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

const containerStyle: CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-xl)',
  right: 'var(--space-xl)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  zIndex: 1000,
};

const toastStyle: CSSProperties = {
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontSize: 13,
  maxWidth: 360,
  cursor: 'pointer',
  animation: 'slideIn 0.2s ease',
};
