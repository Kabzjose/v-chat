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
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100 px-5 py-8 text-slate-900 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="m-0 text-[0.85rem] uppercase tracking-[0.12em] text-slate-500">v-chat</p>
            <h1 className="my-2 text-3xl font-semibold text-slate-900">{room.name}</h1>
            <p className="m-0 text-slate-600">This room is protected. Enter the password to continue.</p>
          </div>

          <Link
            to="/rooms"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 no-underline transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to rooms
          </Link>
        </header>

        <section className="rounded-[24px] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-300/30 backdrop-blur">
          <form onSubmit={handleUnlockRoom} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none transition focus:border-slate-500"
              type="password"
              placeholder="Room password"
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              required
            />
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={unlocking}
            >
              {unlocking ? 'Unlocking...' : 'Unlock room'}
            </button>
          </form>

          {error ? <p className="mb-0 mt-5 text-rose-600">{error}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100 px-5 py-8 text-slate-900 md:px-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="m-0 text-[0.85rem] uppercase tracking-[0.12em] text-slate-500">v-chat</p>
          <h1 className="my-2 text-3xl font-semibold text-slate-900">{room?.name || 'Room #' + roomId}</h1>
          <p className="m-0 text-slate-600">
            Live conversation with your team in one shared space.
          </p>
        </div>

        <Link
          to="/rooms"
          className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 no-underline transition hover:border-slate-400 hover:bg-slate-50"
        >
          Back to rooms
        </Link>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/80 shadow-xl shadow-slate-300/30 backdrop-blur">
        <div className="flex flex-col gap-2 bg-slate-900 px-5 py-4 text-[0.95rem] text-slate-100 md:flex-row md:items-center md:justify-between">
          <span>{status}</span>
          <span>Signed in as {user?.username}</span>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <p className="m-0 text-slate-600">
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
            <p className="m-0 italic text-slate-500">{typingUsers.join(', ')} typing...</p>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 border-t border-slate-200 p-5 md:grid-cols-[1fr_auto]">
          <textarea
            className="resize-y rounded-2xl border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none transition focus:border-slate-500"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Write a message..."
            rows={3}
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-5 py-4 font-bold text-white transition hover:bg-slate-800"
          >
            Send
          </button>
        </form>

        {error ? <p className="mx-5 mb-5 mt-0 text-rose-600">{error}</p> : null}
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
