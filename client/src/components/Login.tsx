import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      login(res.data.user, res.data.token);
      navigate('/rooms');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-10">
      <div className="w-full max-w-[420px] rounded-xl bg-neutral-900 p-10 shadow-2xl shadow-black/30">
        <h1 className="mb-6 text-[1.8rem] font-semibold text-neutral-100">Welcome Back</h1>
        <p className="-mt-3 mb-6 text-[0.85rem] uppercase tracking-[0.12em] text-neutral-400">v-chat</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-neutral-100 outline-none transition focus:border-indigo-400"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-neutral-100 outline-none transition focus:border-indigo-400"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="rounded-lg bg-indigo-600 px-4 py-3 text-base font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <a
          href={(import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/auth/google'}
          className="mt-4 block rounded-lg bg-white px-4 py-3 text-center font-bold text-black no-underline transition hover:bg-neutral-100"
        >
          Continue with Google on v-chat
        </a>

        {error && <p className="mt-4 text-rose-400">{error}</p>}

        <p className="mt-4 text-center text-neutral-400">
          No account? <Link className="text-indigo-300 hover:text-indigo-200" to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
