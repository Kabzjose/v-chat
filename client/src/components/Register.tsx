import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        d="M21.805 10.023H12.18v3.955h5.523c-.238 1.277-.954 2.36-2.028 3.084v2.565h3.29c1.926-1.773 3.04-4.387 3.04-7.48 0-.705-.063-1.385-.18-2.024Z"
        fill="#4285F4"
      />
      <path
        d="M12.18 22c2.76 0 5.075-.914 6.766-2.373l-3.29-2.565c-.914.613-2.082.975-3.476.975-2.658 0-4.91-1.793-5.714-4.205H3.072v2.648A10.213 10.213 0 0 0 12.18 22Z"
        fill="#34A853"
      />
      <path
        d="M6.466 13.832a6.14 6.14 0 0 1-.32-1.932c0-.67.114-1.32.32-1.932V7.32H3.072A10.213 10.213 0 0 0 2 11.9c0 1.646.395 3.205 1.072 4.58l3.394-2.648Z"
        fill="#FBBC05"
      />
      <path
        d="M12.18 5.763c1.5 0 2.847.516 3.908 1.53l2.93-2.93C17.25 2.72 14.936 1.8 12.18 1.8A10.213 10.213 0 0 0 3.072 7.32l3.394 2.648c.803-2.412 3.056-4.205 5.714-4.205Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Register() {
  const [username, setUsername] = useState('');
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
      const res = await api.register(username, email, password);
      login(res.data.user, res.data.token); // save to context + localStorage
      navigate('/rooms'); // redirect to rooms page
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-10">
      <div className="w-full max-w-[420px] rounded-xl bg-neutral-900 p-10 shadow-2xl shadow-black/30">
        <h1 className="mb-6 text-[1.8rem] font-semibold text-neutral-100">Create Account</h1>
        <p className="-mt-3 mb-6 text-[0.85rem] uppercase tracking-[0.12em] text-neutral-400">v-chat</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-neutral-100 outline-none transition focus:border-indigo-400"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
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
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <a
          href={(import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/auth/google'}
          className="mt-4 flex items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-bold text-black no-underline transition hover:bg-neutral-100"
        >
          <GoogleIcon />
          <span>Continue with Google on v-chat</span>
        </a>

        {error && <p className="mt-4 text-rose-400">{error}</p>}

        <p className="mt-4 text-center text-neutral-400">
          Already have an account? <Link className="text-indigo-300 hover:text-indigo-200" to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
