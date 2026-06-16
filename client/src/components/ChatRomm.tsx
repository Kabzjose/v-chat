import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Message from './Message';
import { useAuth } from '../context/AuthContext';
import socket from '../socket';
import type { Message as ChatMessage, OnlineUser, Reaction, Room } from '../types';

export default function ChatRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [roomPassword, setRoomPassword] = useState('');
  const [unlockInput, setUnlockInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Connecting to room...');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [members, setMembers] = useState<{ id: number; username: string; avatar: string | null }[]>([]);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const isCreator = !!(user && room && user.id === room.created_by);

  // ─── LOAD ROOM ────────────────────────────────────────
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

  // ─── LOAD MEMBERS (for creator) ───────────────────────
  useEffect(() => {
    const loadMembers = async () => {
      if (!roomId || !isUnlocked || !isCreator) return;
      try {
        const res = await api.getMembers(Number(roomId));
        setMembers(res.data);
      } catch {
        // non-critical — silently ignore
      }
    };

    loadMembers();
  }, [roomId, isUnlocked, isCreator]);

  // ─── LOAD MESSAGES ────────────────────────────────────
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

  // ─── JOIN ROOM VIA SOCKET ─────────────────────────────
  useEffect(() => {
    if (!roomId || !socket.connected || !isUnlocked) return;
    socket.emit('join_room', { roomId, password: roomPassword || undefined });
    setStatus('Joined room #' + roomId);
  }, [roomId, isUnlocked, roomPassword]);

  // ─── SOCKET EVENTS ────────────────────────────────────
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

    const handleRoomOnlineUsers = (users: OnlineUser[]) => {
      setOnlineUsers(users);
    };

    // ─── KICKED EVENT ─────────────────────────────────
    const handleKicked = ({ roomId: kickedRoomId }: { roomId: number }) => {
      if (String(kickedRoomId) === roomId) {
        alert('You have been removed from this room.');
        navigate('/rooms');
      }
    };

    socket.on('connect', handleConnect);
    socket.on('new_message', handleNewMessage);
    socket.on('reaction_updated', handleReactionUpdate);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('room_online_users', handleRoomOnlineUsers);
    socket.on('error', handleSocketError);
    socket.on('kicked_from_room', handleKicked);

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
      socket.off('room_online_users', handleRoomOnlineUsers);
      socket.off('error', handleSocketError);
      socket.off('kicked_from_room', handleKicked);
    };
  }, [roomId, isUnlocked, roomPassword]);

  useEffect(() => {
    if (!roomId || !isUnlocked) setOnlineUsers([]);
  }, [roomId, isUnlocked]);

  useEffect(() => {
    return () => {
      socket.emit('stop_typing');
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // ─── HANDLERS ─────────────────────────────────────────
  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;
    socket.emit('send_message', { content });
    socket.emit('stop_typing');
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setInput('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Remove this member from the room?')) return;
    try {
      await api.removeMember(Number(roomId), userId);
      socket.emit('kick_member', { roomId, userId });
      setMembers((current) => current.filter((m) => m.id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm('Delete this room permanently? This cannot be undone.')) return;
    try {
      await api.deleteRoom(Number(roomId));
      navigate('/rooms');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete room');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    sendMessage();
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    socket.emit('typing');
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
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

  // ─── LOCKED SCREEN ────────────────────────────────────
  if (room?.is_protected && !isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100 px-5 py-8 text-slate-900 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="m-0 text-[0.85rem] uppercase tracking-[0.12em] text-slate-500">v-chat</p>
            <h1 className="my-2 text-3xl font-semibold text-slate-900">{room.name}</h1>
            <p className="m-0 text-slate-600">This room is protected. Enter the password to continue.</p>
          </div>
          <Link to="/rooms" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 no-underline transition hover:border-slate-400 hover:bg-slate-50">
            Back to rooms
          </Link>
          <Link to="/rooms#profile" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 no-underline transition hover:border-slate-400 hover:bg-slate-50">
            Edit profile
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

  // ─── MAIN CHAT VIEW ───────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100 px-5 py-8 text-slate-900 md:px-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="m-0 text-[0.85rem] uppercase tracking-[0.12em] text-slate-500">v-chat</p>
          <h1 className="my-2 text-3xl font-semibold text-slate-900">{room?.name || 'Room #' + roomId}</h1>
          <p className="m-0 text-slate-600">Live conversation with your team in one shared space.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/rooms" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 no-underline transition hover:border-slate-400 hover:bg-slate-50">
            Back to rooms
          </Link>
          <Link to="/rooms#profile" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 no-underline transition hover:border-slate-400 hover:bg-slate-50">
            Edit profile
          </Link>

          {/* ─── DELETE ROOM (creator only) ─── */}
          {isCreator && (
            <button
              onClick={handleDeleteRoom}
              className="inline-flex rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-600 transition hover:bg-red-100"
            >
              Delete Room
            </button>
          )}
        </div>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/80 shadow-xl shadow-slate-300/30 backdrop-blur">
        <div className="flex flex-col gap-2 bg-slate-900 px-5 py-4 text-[0.95rem] text-slate-100 md:flex-row md:items-center md:justify-between">
          <span>{status}</span>
          <span>{onlineUsers.length} online</span>
          <span>Signed in as {user?.username}</span>
        </div>

        {/* ─── MEMBERS LIST (creator only) ─── */}
        {isCreator && members.length > 0 && (
          <div className="border-b border-slate-200 px-5 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Members</p>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-sm">
                  <span>{member.username}</span>
                  {member.id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400 hover:text-red-600 transition font-bold"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <p className="m-0 text-slate-600">No messages yet. Start the conversation.</p>
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
            onKeyDown={handleKeyDown}
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