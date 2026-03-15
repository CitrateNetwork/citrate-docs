import { Component, type ReactNode, type CSSProperties } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Catches render errors and displays a fallback UI instead of crashing the app. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={containerStyle}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)', fontSize: 14 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            style={btnStyle}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const containerStyle: CSSProperties = {
  textAlign: 'center',
  padding: 'var(--space-3xl)',
  border: '2px dashed var(--color-error)',
  borderRadius: 'var(--radius-lg)',
  margin: 'var(--space-xl)',
};

const btnStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-xl)',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  cursor: 'pointer',
};
