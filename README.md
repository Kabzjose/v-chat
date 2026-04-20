# v-chat

v-chat is a full-stack real-time chat application built with React, Vite, Express, PostgreSQL, JWT authentication, Google OAuth, Socket.IO, Redis, and Passport session support.

Users can register or log in, browse and create chat rooms, unlock password-protected rooms, join live conversations, and see typing and presence updates in real time.

## Features

- Email/password authentication with JWT
- Google OAuth login with Passport
- Protected frontend routes and session restore from local storage
- Real-time messaging with Socket.IO
- Typing indicators, join/leave updates, and online-user presence
- Public and password-protected chat rooms
- PostgreSQL-backed session storage for Passport sessions
- Redis-backed message caching and presence tracking

## Tech Stack

- Client: React, TypeScript, Vite, Axios, React Router
- Server: Node.js, Express, Socket.IO, Passport, JWT, express-session
- Database: PostgreSQL
- Cache / presence: Redis via ioredis

## Project Structure

```text
chat-app/
├── client/   # React + Vite frontend
└── server/   # Express + PostgreSQL + Socket.IO backend
```

## Requirements

- Node.js 18+
- PostgreSQL
- Redis
- Google OAuth credentials if you want Google sign-in enabled

## Environment Variables

Production URLs:

- Frontend: https://v-chat-smoky.vercel.app
- Backend: https://v-chat-l3gp.onrender.com

### Server

Create server/.env with:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/v_chat
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
BASE_URL=http://localhost:4000
JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-a-different-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Notes:

- `JWT_SECRET` signs login tokens.
- `SESSION_SECRET` signs Passport session cookies.
- `DATABASE_URL` points to PostgreSQL.
- `REDIS_URL` is used for online presence and message caching. If omitted, the server falls back to `redis://localhost:6379`.
- `CLIENT_URL` is used for CORS and Google OAuth redirect handling.
- `BASE_URL` is used to build the Google OAuth callback URL.
- If you are not using Google OAuth yet, you can leave the Google variables unset, but the Google login flow will not work.

Production example:

```env
CLIENT_URL=https://v-chat-smoky.vercel.app
BASE_URL=https://v-chat-l3gp.onrender.com
REDIS_URL=redis://localhost:6379
```

### Client

Create client/.env with:

```env
VITE_API_URL=http://localhost:4000
```

Production example:

```env
VITE_API_URL=https://v-chat-l3gp.onrender.com
```

## Database Setup

This project expects PostgreSQL tables for users, rooms, messages, reactions, and sessions.

The app automatically adds rooms.password_hash if it does not already exist, but it does not create the main tables for you.

Example schema:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  google_id TEXT UNIQUE,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  password_hash TEXT
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL
);
```

For production sessions with connect-pg-simple, create the session table too:

```sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
```

## Installation

Install dependencies for both apps:

```bash
cd server && npm install
cd ../client && npm install
```

## Running Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

Live frontend: https://v-chat-smoky.vercel.app  
Live backend: https://v-chat-l3gp.onrender.com

## Available Scripts

### Server

- `npm run dev` starts the backend with nodemon
- `npm start` starts the backend with Node

### Client

- `npm run dev` starts the Vite dev server
- `npm run build` builds the frontend for production
- `npm run preview` previews the production build
- `npm run lint` runs ESLint

## API Overview

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/google`
- `GET /auth/google/callback`

### Rooms

- `GET /api/rooms`
- `POST /api/rooms`
- `GET /api/rooms/:roomId`
- `POST /api/rooms/:roomId/unlock`
- `GET /api/rooms/:roomId/messages`

### Health

- `GET /health`

## Real-Time Events

Socket.IO connection requires a JWT token in socket.auth.token.

Client-emitted events:

- `join_room`
- `send_message`
- `typing`
- `stop_typing`
- `get_online_users`

Server-emitted events:

- `user_online`
- `user_offline`
- `user_joined`
- `user_left`
- `user_typing`
- `user_stop_typing`
- `room_messages`
- `new_message`
- `room_online_users`
- `error`

## Production Notes

- Set all secrets through your deployment provider's environment settings.
- Use a strong `JWT_SECRET` and a different strong `SESSION_SECRET`.
- Set `CLIENT_URL=https://v-chat-smoky.vercel.app` and `BASE_URL=https://v-chat-l3gp.onrender.com` on the backend.
- Set `VITE_API_URL=https://v-chat-l3gp.onrender.com` on the frontend.
- Provide a reachable Redis instance in production if you want presence tracking and cached room messages.

## Known Gaps

- There is no migration system yet for creating the main database schema.
- Google OAuth requires valid callback URLs configured in Google Cloud.
- The backend assumes the required tables already exist.
- Message reaction UI exists on the client, but the server does not currently implement reaction persistence or reaction update events.
- Password protection is enforced by the room unlock and message-fetch HTTP endpoints; the socket join flow does not independently validate room passwords.

## License

ISC
