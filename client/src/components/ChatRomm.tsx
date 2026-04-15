import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import Message from './Message';
import { useAuth } from '../context/AuthContext';
import socket from '../socket';
import type { Message as ChatMessage, Reaction, Room } from '../types';

export default function ChatRomm() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [roomPassword, setRoomPassword] = useState('');
  const [unlockInput, setUnlockInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Connecting to room...');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId) return;

      try {
        setError('');
        const res = await api.getRoom(Number(roomId));
        setRoom(res.data);

        if (!res.data.is_protected) {
          setIsUnlocked(true);
          setRoomPassword('');
          return;
        }

        const savedPassword = sessionStorage.getItem('room-password-' + roomId) || '';
        if (!savedPassword) {
          setIsUnlocked(false);
          return;
        }

        await api.unlockRoom(Number(roomId), savedPassword);
        setRoomPassword(savedPassword);
        setUnlockInput(savedPassword);
        setIsUnlocked(true);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load room');
      }
    };

    loadRoom();
  }, [roomId]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!roomId || !isUnlocked) return;

      try {
        const res = await api.getMessages(Number(roomId), roomPassword || undefined);
        setMessages(res.data.map(normalizeMessage));
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load messages');
      }
    };

    loadMessages();
  }, [roomId, isUnlocked, roomPassword]);

  useEffect(() => {
    if (!roomId || !socket.connected || !isUnlocked) return;

    socket.emit('join_room', { roomId, password: roomPassword || undefined });
    setStatus('Joined room #' + roomId);
  }, [roomId, isUnlocked, roomPassword]);

  useEffect(() => {
    const handleConnect = () => {
      if (!roomId || !isUnlocked) return;
      socket.emit('join_room', { roomId, password: roomPassword || undefined });
      setStatus('Joined room #' + roomId);
    };

    const handleNewMessage = (message: ChatMessage) => {
      setMessages((current) => [...current, normalizeMessage(message)]);
    };

    const handleReactionUpdate = ({ messageId, reactions }: { messageId: number; reactions: Reaction[] }) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, reactions } : message
        )
      );
    };

    const handleUserJoined = ({ username }: { username: string }) => {
      setStatus(username + ' joined the room');
      setMessages((current) => [...current, createSystemMessage(username + ' joined the room')]);
    };

    const handleUserLeft = ({ username }: { username: string }) => {
      setStatus(username + ' left the room');
      setMessages((current) => [...current, createSystemMessage(username + ' left the room')]);
    };

    const handleUserTyping = ({ username }: { username: string }) => {
      setTypingUsers((current) => (current.includes(username) ? current : [...current, username]));
    };

    const handleUserStopTyping = ({ username }: { username: string }) => {
      setTypingUsers((current) => current.filter((name) => name !== username));
    };

    const handleSocketError = (payload: { message?: string }) => {
      setError(payload.message || 'Socket error');
    };

    socket.on('connect', handleConnect);
    socket.on('new_message', handleNewMessage);
    socket.on('reaction_updated', handleReactionUpdate);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('error', handleSocketError);

    if (socket.connected && roomId && isUnlocked) {
      socket.emit('join_room', { roomId, password: roomPassword || undefined });
      setStatus('Joined room #' + roomId);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('new_message', handleNewMessage);
      socket.off('reaction_updated', handleReactionUpdate);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('error', handleSocketError);
    };
  }, [roomId, isUnlocked, roomPassword]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const content = input.trim();
    if (!content) return;

    socket.emit('send_message', { content });
    socket.emit('stop_typing');
    setInput('');
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    socket.emit('typing');

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      socket.emit('stop_typing');
    }, 1200);
  };

  const handleReaction = (messageId: number | string, emoji: string) => {
    socket.emit('add_reaction', { messageId, emoji });
  };

  const handleUnlockRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomId) return;

    setUnlocking(true);
    setError('');

    try {
      await api.unlockRoom(Number(roomId), unlockInput);
      sessionStorage.setItem('room-password-' + roomId, unlockInput);
      setRoomPassword(unlockInput);
      setIsUnlocked(true);
      setStatus('Unlocked room #' + roomId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unlock room');
    } finally {
      setUnlocking(false);
    }
  };

  if (room?.is_protected && !isUnlocked) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>v-chat</p>
            <h1 style={styles.title}>{room.name}</h1>
            <p style={styles.subtitle}>This room is protected. Enter the password to continue.</p>
          </div>

          <Link to="/rooms" style={styles.backLink}>
            Back to rooms
          </Link>
        </header>

        <section style={styles.unlockShell}>
          <form onSubmit={handleUnlockRoom} style={styles.unlockForm}>
            <input
              style={styles.textarea}
              type="password"
              placeholder="Room password"
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              required
            />
            <button type="submit" style={styles.sendButton} disabled={unlocking}>
              {unlocking ? 'Unlocking...' : 'Unlock room'}
            </button>
          </form>

          {error ? <p style={styles.error}>{error}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>v-chat</p>
          <h1 style={styles.title}>{room?.name || 'Room #' + roomId}</h1>
          <p style={styles.subtitle}>
            Live conversation with your team in one shared space.
          </p>
        </div>

        <Link to="/rooms" style={styles.backLink}>
          Back to rooms
        </Link>
      </header>

      <section style={styles.chatShell}>
        <div style={styles.metaBar}>
          <span>{status}</span>
          <span>Signed in as {user?.username}</span>
        </div>

        <div style={styles.messages}>
          {messages.length === 0 ? (
            <p style={styles.emptyState}>
              No messages yet. Start the conversation.
            </p>
          ) : null}

          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              currentUsername={user?.username}
              onReact={handleReaction}
            />
          ))}

          {typingUsers.length > 0 ? (
            <p style={styles.typingIndicator}>{typingUsers.join(', ')} typing...</p>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} style={styles.composer}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Write a message..."
            rows={3}
          />
          <button type="submit" style={styles.sendButton}>
            Send
          </button>
        </form>

        {error ? <p style={styles.error}>{error}</p> : null}
      </section>
    </div>
  );
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    avatar: message.avatar || null,
    reactions: message.reactions || [],
    kind: message.kind || 'user'
  };
}

function createSystemMessage(content: string): ChatMessage {
  return {
    id: 'system-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    content,
    username: 'system',
    avatar: null,
    created_at: new Date().toISOString(),
    reactions: [],
    kind: 'system'
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    background: 'linear-gradient(180deg, #f7fbff 0%, #eaf2ff 100%)',
    color: '#10203a'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    marginBottom: '1.5rem'
  },
  eyebrow: {
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#4f6b95',
    fontSize: '0.85rem'
  },
  title: {
    margin: '0.45rem 0',
    color: '#10203a'
  },
  subtitle: {
    margin: 0,
    color: '#53657f'
  },
  backLink: {
    textDecoration: 'none',
    color: '#10203a',
    border: '1px solid #bfd0ec',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    background: '#fff'
  },
  chatShell: {
    background: 'rgba(255,255,255,0.78)',
    border: '1px solid #dce6f8',
    borderRadius: '24px',
    boxShadow: '0 20px 45px rgba(95, 122, 171, 0.12)',
    overflow: 'hidden'
  },
  unlockShell: {
    background: 'rgba(255,255,255,0.78)',
    border: '1px solid #dce6f8',
    borderRadius: '24px',
    boxShadow: '0 20px 45px rgba(95, 122, 171, 0.12)',
    padding: '1.5rem'
  },
  unlockForm: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.75rem'
  },
  metaBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '1rem 1.25rem',
    background: '#10203a',
    color: '#eaf2ff',
    fontSize: '0.95rem'
  },
  messages: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: '1.25rem'
  },
  emptyState: {
    margin: 0,
    color: '#53657f'
  },
  typingIndicator: {
    margin: 0,
    color: '#4f6b95',
    fontStyle: 'italic'
  },
  composer: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.75rem',
    padding: '1.25rem',
    borderTop: '1px solid #dce6f8'
  },
  textarea: {
    borderRadius: '16px',
    border: '1px solid #bfd0ec',
    background: '#fff',
    color: '#10203a',
    padding: '0.9rem 1rem',
    resize: 'vertical',
    fontSize: '1rem'
  },
  sendButton: {
    alignSelf: 'end',
    border: 'none',
    borderRadius: '14px',
    background: '#10203a',
    color: '#fff',
    padding: '0.9rem 1.2rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  error: {
    margin: '0 1.25rem 1.25rem',
    color: '#d14343'
  }
};
