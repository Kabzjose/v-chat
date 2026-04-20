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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6">
        <div className="rounded-[20px] border border-slate-700/40 bg-slate-950/70 px-7 py-6 text-center text-slate-50 backdrop-blur">
          <p className="m-0 text-[0.85rem] uppercase tracking-[0.12em] text-slate-300">v-chat</p>
          <p className="mt-2 text-white">Restoring your session...</p>
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
