import { useState, useRef, useEffect, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { runInference, listModels } from '../services/inference.ts';
import type { ChatMessage } from '../services/encryption.ts';

export function ChatPage() {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listModels().then(m => {
      setModels(m);
      if (m.length > 0 && !selectedModel) setSelectedModel(m[0].id);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await runInference(selectedModel, updated);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.output,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Inference failed'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleMintClick() {
    // Pass conversation via session storage to avoid URL size limits
    sessionStorage.setItem('chatVault_conversation', JSON.stringify(messages));
    sessionStorage.setItem('chatVault_modelId', selectedModel);
    navigate('/mint');
  }

  if (!isConnected) {
    return (
      <div style={emptyStyle}>
        <p>Connect your wallet to start chatting with on-chain AI models.</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Model selector */}
      <div style={modelBarStyle}>
        <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Model:</label>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          style={selectStyle}
        >
          {models.length === 0 && <option value="">No models available</option>}
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {messages.length >= 2 && (
          <button style={mintBtnStyle} onClick={handleMintClick}>
            Mint Conversation
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={messagesStyle}>
        {messages.length === 0 && (
          <div style={welcomeStyle}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-md)' }}>{"{ }"}</div>
            <p>Send a message to start a conversation.</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>
              Conversations can be encrypted and minted as NFTs.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...bubbleStyle,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor:
                msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface)',
              borderColor:
                msg.role === 'user' ? 'transparent' : 'var(--color-border)',
            }}
          >
            <div style={{ fontSize: 10, color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</div>
            <div style={timestampStyle}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...bubbleStyle, alignSelf: 'flex-start', backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>AI</div>
            <div style={{ animation: 'pulse 1.5s infinite', color: 'var(--color-text-secondary)' }}>Thinking...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={inputBarStyle}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          style={inputStyle}
          disabled={loading || !selectedModel}
        />
        <button
          type="submit"
          style={{
            ...sendBtnStyle,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 80px)',
  maxWidth: 800,
  margin: '0 auto',
};

const modelBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-md)',
  padding: 'var(--space-md) var(--space-lg)',
  borderBottom: '1px solid var(--color-border)',
};

const selectStyle: CSSProperties = {
  padding: 'var(--space-xs) var(--space-sm)',
  fontSize: 13,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  flex: 1,
  maxWidth: 300,
};

const mintBtnStyle: CSSProperties = {
  marginLeft: 'auto',
  padding: 'var(--space-xs) var(--space-md)',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-success)',
  backgroundColor: 'transparent',
  color: 'var(--color-success)',
  cursor: 'pointer',
};

const messagesStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 'var(--space-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
};

const welcomeStyle: CSSProperties = {
  textAlign: 'center',
  padding: 'var(--space-3xl)',
  color: 'var(--color-text-secondary)',
};

const bubbleStyle: CSSProperties = {
  maxWidth: '75%',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid',
  fontSize: 14,
  animation: 'slideIn 0.2s ease',
};

const timestampStyle: CSSProperties = {
  fontSize: 10,
  color: 'var(--color-text-muted)',
  marginTop: 'var(--space-xs)',
  textAlign: 'right',
};

const inputBarStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-sm)',
  padding: 'var(--space-lg)',
  borderTop: '1px solid var(--color-border)',
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: 'var(--space-md) var(--space-lg)',
  fontSize: 14,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  outline: 'none',
};

const sendBtnStyle: CSSProperties = {
  padding: 'var(--space-md) var(--space-xl)',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 'var(--radius-lg)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
};

const emptyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100vh - 80px)',
  color: 'var(--color-text-muted)',
  padding: 'var(--space-3xl)',
  textAlign: 'center',
  border: '2px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  margin: 'var(--space-xl)',
};
