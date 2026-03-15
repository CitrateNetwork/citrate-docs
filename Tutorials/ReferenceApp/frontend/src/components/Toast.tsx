import type { CSSProperties } from 'react';
import type { Toast as ToastData } from '../hooks/useToast';

interface Props {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

/** Renders a stack of toast notifications in the bottom-right corner. */
export function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map(t => (
        <div key={t.id} style={{ ...toastStyle, borderLeftColor: colorMap[t.type] }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            style={dismissStyle}
            onClick={() => onDismiss(t.id)}
            title="Dismiss"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

const colorMap: Record<ToastData['type'], string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  info: 'var(--color-accent)',
};

const containerStyle: CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-xl)',
  right: 'var(--space-xl)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  zIndex: 9999,
  maxWidth: 380,
};

const toastStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-md)',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderLeft: '3px solid',
  fontSize: 13,
  color: 'var(--color-text)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  animation: 'slideIn 0.2s ease-out',
};

const dismissStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  padding: 0,
};
