import type { Message as ChatMessage } from '../types';

interface MessageProps {
  message: ChatMessage;
  currentUsername?: string;
  onReact: (messageId: number | string, emoji: string) => void;
}

const EMOJIS = ['👍', '❤️', '😂', '🔥'];

export default function Message({ message, currentUsername, onReact }: MessageProps) {
  if (message.kind === 'system') {
    return <p style={styles.systemMessage}>{message.content}</p>;
  }

  const isOwnMessage = currentUsername === message.username;
  const reactions = message.reactions || [];

  return (
    <article style={{ ...styles.card, ...(isOwnMessage ? styles.ownCard : {}) }}>
      <div style={styles.header}>
        <div>
          <strong>{message.username}</strong>
          <p style={styles.timestamp}>{new Date(message.created_at).toLocaleTimeString()}</p>
        </div>
      </div>

      <p style={styles.content}>{message.content}</p>

      <div style={styles.reactions}>
        {reactions.map((reaction, index) => (
          <span key={reaction.emoji + reaction.user_id + index} style={styles.reactionBadge}>
            {reaction.emoji}
          </span>
        ))}
      </div>

      <div style={styles.actions}>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            style={styles.emojiButton}
            onClick={() => onReact(message.id, emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#f4f8ff',
    border: '1px solid #d9e4f7',
    borderRadius: '18px',
    padding: '1rem',
    textAlign: 'left'
  },
  ownCard: {
    background: '#dcfff6',
    borderColor: '#b4eadc'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem'
  },
  timestamp: {
    margin: '0.2rem 0 0',
    color: '#64748b',
    fontSize: '0.85rem'
  },
  content: {
    margin: '0.85rem 0',
    color: '#10203a',
    whiteSpace: 'pre-wrap'
  },
  reactions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    minHeight: '1.8rem'
  },
  reactionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2rem',
    padding: '0.2rem 0.55rem',
    borderRadius: '999px',
    background: '#e2e8f0'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.85rem'
  },
  emojiButton: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: '999px',
    padding: '0.35rem 0.55rem',
    cursor: 'pointer'
  },
  systemMessage: {
    margin: 0,
    alignSelf: 'center',
    padding: '0.45rem 0.8rem',
    borderRadius: '999px',
    background: '#e8eef8',
    color: '#53657f',
    fontSize: '0.9rem'
  }
};
