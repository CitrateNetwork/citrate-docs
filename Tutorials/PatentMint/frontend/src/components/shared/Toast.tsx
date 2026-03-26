import type { Toast } from '../../hooks/useToast.ts';

const typeColors: Record<Toast['type'], string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
};

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 'var(--space-xl)', right: 'var(--space-xl)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', zIndex: 1000,
    }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{
          padding: 'var(--space-md) var(--space-lg)',
          backgroundColor: 'var(--color-surface)',
          border: `1px solid ${typeColors[t.type]}`,
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text)',
          fontSize: 14,
          cursor: 'pointer',
          maxWidth: 360,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
