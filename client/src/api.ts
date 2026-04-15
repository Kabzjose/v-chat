import axios from 'axios';
import type { AuthResponse, Room, Message } from './types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// attach token to every request automatically
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

const api = {
  // auth
  register: (username: string, email: string, password: string) =>
    axios.post<AuthResponse>(BASE + '/auth/register', { username, email, password }),

  login: (email: string, password: string) =>
    axios.post<AuthResponse>(BASE + '/auth/login', { email, password }),

  // rooms
  getRooms: () =>
    axios.get<Room[]>(BASE + '/api/rooms'),

  getRoom: (roomId: number) =>
    axios.get<Room>(BASE + '/api/rooms/' + roomId),

  createRoom: (name: string, description: string, password?: string) =>
    axios.post<Room>(BASE + '/api/rooms', { name, description, password }),

  unlockRoom: (roomId: number, password: string) =>
    axios.post<{ ok: boolean }>(BASE + '/api/rooms/' + roomId + '/unlock', { password }),

  // messages
  getMessages: (roomId: number, roomPassword?: string) =>
    axios.get<Message[]>(BASE + '/api/rooms/' + roomId + '/messages', {
      headers: roomPassword ? { 'x-room-password': roomPassword } : undefined
    }),
};

export default api;
