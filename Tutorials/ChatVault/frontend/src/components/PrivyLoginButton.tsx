import { type CSSProperties } from 'react';
import { usePrivy } from '@privy-io/react-auth';

/**
 * Privy social login button — must only be rendered inside PrivyProvider.
 * Separated into its own file so the usePrivy() import only runs
 * when this component is actually mounted (i.e., PRIVY_ENABLED is true).
 */
export function PrivyLoginButton() {
  const { login } = usePrivy();
  return (
    <button style={socialBtnStyle} onClick={() => login()}>
      Social Login
    </button>
  );
}

const socialBtnStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-lg)',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-accent)',
  backgroundColor: 'transparent',
  color: 'var(--color-accent)',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};
