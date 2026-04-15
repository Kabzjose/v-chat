import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// create socket but don't connect yet
// we connect only after the user logs in
const socket = io(BASE, {
  autoConnect: false, // important — don't connect until we have a token
  auth: {
    // this is read when connecting
    // we set the token dynamically before connecting
    token: ''
  }
});

export default socket;