import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import RoomList from './components/RoomList';
import ChatRomm from './components/ChatRomm';

// protected route — redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingCard}>
          <p style={styles.loadingEyebrow}>v-chat</p>
          <p style={styles.loadingText}>Restoring your session...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Google OAuth callback handler
const AuthCallback = () => {
  const { login } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (token) {
    // decode the JWT to get user info
    const payload = JSON.parse(atob(token.split('.')[1]));
    login({ id: payload.id, username: payload.username, email: payload.email, avatar: null }, token);
  }

  return <Navigate to="/rooms" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/rooms" element={
        <ProtectedRoute><RoomList /></ProtectedRoute>
      } />
      <Route path="/rooms/:roomId" element={
        <ProtectedRoute><ChatRomm /></ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/rooms" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #081120 0%, #111b33 45%, #1b2f52 100%)',
    padding: '1.5rem'
  },
  loadingCard: {
    borderRadius: '20px',
    padding: '1.5rem 1.75rem',
    background: 'rgba(7, 14, 27, 0.74)',
    border: '1px solid rgba(157, 179, 213, 0.18)',
    color: '#f5f7fb',
    textAlign: 'center'
  },
  loadingEyebrow: {
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#9db3d5',
    fontSize: '0.85rem'
  },
  loadingText: {
    margin: '0.6rem 0 0',
    color: '#fff'
  }
};
