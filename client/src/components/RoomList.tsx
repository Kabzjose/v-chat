import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import type { Room } from '../types';

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
      const res = await api.createRoom(name, description);
      const room = res.data;
      setRooms((current) => [room as Room, ...current]);
      setName('');
      setDescription('');
      navigate('/rooms/' + room.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Realtime Chat</p>
          <h1 style={styles.title}>Welcome, {user?.username}</h1>
          <p style={styles.subtitle}>
            Pick a room to jump into the conversation, or create a new one for your team.
          </p>
        </div>

        <button type="button" style={styles.secondaryButton} onClick={logout}>
          Logout
        </button>
      </div>

      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create Room</h2>
          <p style={styles.sectionCopy}>
            This form sends a protected `POST /api/rooms` request. The JWT is added automatically by Axios.
          </p>

          <form onSubmit={handleCreateRoom} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              style={styles.textarea}
              placeholder="What is this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <button type="submit" style={styles.primaryButton} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create room'}
            </button>
          </form>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Available Rooms</h2>
          <p style={styles.sectionCopy}>
            This list is loaded from `GET /api/rooms` and sorted by newest first on the backend.
          </p>

          {loading ? <p style={styles.muted}>Loading rooms...</p> : null}
          {!loading && rooms.length === 0 ? <p style={styles.muted}>No rooms yet. Create the first one.</p> : null}

          <div style={styles.roomList}>
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                style={styles.roomCard}
                onClick={() => navigate('/rooms/' + room.id)}
              >
                <div style={styles.roomCardHeader}>
                  <strong>{room.name}</strong>
                  <span style={styles.count}>{room.message_count} messages</span>
                </div>
                <p style={styles.roomDescription}>
                  {room.description || 'No description yet.'}
                </p>
                <p style={styles.meta}>Created by {room.creator || 'Unknown user'}</p>
              </button>
            ))}
          </div>

          {error ? <p style={styles.error}>{error}</p> : null}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    color: '#f5f7fb',
    background: 'linear-gradient(135deg, #081120 0%, #111b33 45%, #1b2f52 100%)'
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    marginBottom: '2rem'
  },
  eyebrow: {
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#9db3d5',
    fontSize: '0.85rem'
  },
  title: {
    margin: '0.5rem 0',
    color: '#fff',
    fontSize: '2.4rem'
  },
  subtitle: {
    margin: 0,
    maxWidth: '42rem',
    color: '#c7d3ea'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  panel: {
    background: 'rgba(7, 14, 27, 0.74)',
    border: '1px solid rgba(157, 179, 213, 0.18)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
    textAlign: 'left'
  },
  sectionTitle: {
    margin: 0,
    color: '#fff',
    fontSize: '1.3rem'
  },
  sectionCopy: {
    margin: '0.75rem 0 1.25rem',
    color: '#a8b8d6'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem'
  },
  input: {
    borderRadius: '12px',
    border: '1px solid #32476d',
    background: '#0c1628',
    color: '#f5f7fb',
    padding: '0.9rem 1rem',
    fontSize: '1rem'
  },
  textarea: {
    borderRadius: '12px',
    border: '1px solid #32476d',
    background: '#0c1628',
    color: '#f5f7fb',
    padding: '0.9rem 1rem',
    fontSize: '1rem',
    resize: 'vertical'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '12px',
    background: '#53c0a7',
    color: '#08241e',
    padding: '0.9rem 1rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    padding: '0.8rem 1rem',
    cursor: 'pointer'
  },
  muted: {
    color: '#a8b8d6'
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem'
  },
  roomCard: {
    width: '100%',
    textAlign: 'left',
    borderRadius: '16px',
    padding: '1rem',
    border: '1px solid rgba(157, 179, 213, 0.18)',
    background: '#0f1b31',
    color: '#f5f7fb',
    cursor: 'pointer'
  },
  roomCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'center'
  },
  count: {
    color: '#9db3d5',
    fontSize: '0.9rem'
  },
  roomDescription: {
    margin: '0.6rem 0',
    color: '#c7d3ea'
  },
  meta: {
    margin: 0,
    color: '#84a0ca',
    fontSize: '0.9rem'
  },
  error: {
    marginTop: '1rem',
    color: '#ff9ca3'
  }
};
