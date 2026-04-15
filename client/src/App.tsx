import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';

// placeholder components — we'll build these next
const Rooms = () => <div style={{color:'#fff', padding:'2rem'}}>Rooms coming soon...</div>;
const Chat = () => <div style={{color:'#fff', padding:'2rem'}}>Chat coming soon...</div>;

// protected route — redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
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
        <ProtectedRoute><Rooms /></ProtectedRoute>
      } />
      <Route path="/rooms/:roomId" element={
        <ProtectedRoute><Chat /></ProtectedRoute>
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