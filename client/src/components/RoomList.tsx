import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import type { Room } from '../types';

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await api.getRooms();
        setRooms(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.createRoom(name, description, roomPassword || undefined);
      const room = res.data;
      setRooms((current) => [room as Room, ...current]);
      setName('');
      setDescription('');
      setRoomPassword('');
      navigate('/rooms/' + room.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-8 text-slate-50 md:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="m-0 text-[0.85rem] uppercase tracking-[0.12em] text-slate-300">v-chat</p>
          <h1 className="my-2 text-4xl font-semibold text-white">Welcome, {user?.username}</h1>
          <p className="m-0 max-w-2xl text-slate-300">
            Pick a room to jump into the conversation, or create a new one for your team.
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[20px] border border-slate-600/30 bg-slate-950/60 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <h2 className="m-0 text-[1.3rem] font-semibold text-white">Create Room</h2>
          <p className="mb-5 mt-3 text-slate-300">
            Start a fresh space for your team, topic, or conversation.
          </p>

          <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
            <input
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none transition focus:border-emerald-400"
              placeholder="Room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              className="resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none transition focus:border-emerald-400"
              placeholder="What is this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <input
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none transition focus:border-emerald-400"
              type="password"
              placeholder="Room password (optional)"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-400 px-4 py-4 font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create room'}
            </button>
          </form>
        </section>

        <section className="rounded-[20px] border border-slate-600/30 bg-slate-950/60 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <h2 className="m-0 text-[1.3rem] font-semibold text-white">Available Rooms</h2>
          <p className="mb-5 mt-3 text-slate-300">
            Browse active spaces and jump into the conversation.
          </p>

          {loading ? <p className="text-slate-300">Loading rooms...</p> : null}
          {!loading && rooms.length === 0 ? <p className="text-slate-300">No rooms yet. Create the first one.</p> : null}

          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className="w-full rounded-2xl border border-slate-600/30 bg-slate-900 px-4 py-4 text-left text-slate-50 transition hover:border-slate-400/50 hover:bg-slate-800"
                onClick={() => navigate('/rooms/' + room.id)}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{room.name}</strong>
                    {room.is_protected ? (
                      <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[0.75rem] uppercase tracking-[0.08em] text-emerald-200">
                        Private
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm text-slate-300">{room.message_count} messages</span>
                </div>
                <p className="my-3 text-slate-200">
                  {room.description || 'No description yet.'}
                </p>
                <p className="m-0 text-sm text-slate-400">Created by {room.creator || 'Unknown user'}</p>
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 text-rose-300">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
