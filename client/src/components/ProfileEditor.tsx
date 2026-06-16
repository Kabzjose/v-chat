import { useEffect, useState, type FormEvent } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ProfileEditor() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setAvatar(user?.avatar || '');
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    setLoading(true);

    try {
      const res = await api.updateProfile({
        username,
        email,
        avatar: avatar.trim() || null
      });

      login(res.data.user, res.data.token);
      setSaved('Profile updated');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="profile" className="rounded-[20px] border border-slate-600/30 bg-slate-950/60 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="m-0 text-[0.85rem] uppercase tracking-[0.12em] text-slate-300">Profile</p>
          <h2 className="mt-2 text-[1.3rem] font-semibold text-white">Edit your details</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Update the name and avatar other people see in rooms and messages.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-700/40 bg-slate-900/70 px-4 py-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-lg font-semibold text-white">
            {avatar ? <img src={avatar} alt={username || 'Profile avatar'} className="h-full w-full object-cover" /> : (username?.[0] || '?')}
          </div>
          <div>
            <p className="m-0 text-sm text-slate-400">Signed in as</p>
            <p className="m-0 font-medium text-white">{username || 'Unknown user'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        <input
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none transition focus:border-emerald-400"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none transition focus:border-emerald-400"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none transition focus:border-emerald-400"
          placeholder="Avatar URL"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-emerald-400 px-5 py-4 font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      {error ? <p className="mb-0 mt-4 text-rose-300">{error}</p> : null}
      {saved ? <p className="mb-0 mt-4 text-emerald-300">{saved}</p> : null}
    </section>
  );
}