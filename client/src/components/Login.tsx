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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome Back</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <a
          href={'http://localhost:4000/auth/google'}
          style={styles.googleButton}
        >
          Continue with Google
        </a>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.link}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' },
  card: { background: '#1a1a1a', padding: '2.5rem', borderRadius: '12px', width: '100%', maxWidth: '420px' },
  title: { marginBottom: '1.5rem', fontSize: '1.8rem', color: '#f0f0f0' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  input: { padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #333', background: '#0f0f0f', color: '#f0f0f0', fontSize: '1rem' },
  button: { padding: '0.75rem', borderRadius: '8px', background: '#4f46e5', color: '#fff', border: 'none', fontSize: '1rem', cursor: 'pointer' },
  googleButton: { display: 'block', marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: '#fff', color: '#000', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold' },
  error: { marginTop: '1rem', color: '#f87171' },
  link: { marginTop: '1rem', color: '#888', textAlign: 'center' },
};