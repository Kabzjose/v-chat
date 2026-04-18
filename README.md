# v-chat

v-chat is a full-stack real-time chat application built with React, Vite, Express, PostgreSQL, JWT auth, Google OAuth, and Socket.IO.

Users can register or log in, create chat rooms, protect rooms with passwords, join live conversations, and react to messages with emojis.

## Features

- Email/password authentication with JWT
- Google OAuth login
- Protected frontend routes
- Real-time messaging with Socket.IO
- Typing indicators and join/leave updates
- Emoji reactions on messages
- Public and password-protected chat rooms
- PostgreSQL-backed session storage for Passport sessions

## Tech Stack

- Client: React, TypeScript, Vite, Axios, React Router
- Server: Node.js, Express, Socket.IO, Passport, JWT
- Database: PostgreSQL
- Auth: JWT, Passport Google OAuth, express-session

## Project Structure

```text
chat-app/
├── client/   # React + Vite frontend
└── server/   # Express + PostgreSQL + Socket.IO backend
```

## Requirements

- Node.js 18+
- PostgreSQL
- Google OAuth credentials if you want Google sign-in enabled

## Environment Variables

Production URLs:

- Frontend: `https://v-chat-smoky.vercel.app/`
- Backend: `https://v-chat-l3gp.onrender.com/`

### Server

Create `server/.env` with:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/v_chat
CLIENT_URL=http://localhost:5173
BASE_URL=http://localhost:4000
JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-a-different-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Notes:

- `JWT_SECRET` is used to sign login tokens.
- `SESSION_SECRET` is used by `express-session` to sign session cookies.
- `BASE_URL` should point to the backend server.
- `CLIENT_URL` should point to the frontend app.
- If you are not using Google OAuth yet, you can leave the Google variables unset, but the Google login flow will not work.

Production example:

```env
CLIENT_URL=https://v-chat-smoky.vercel.app
BASE_URL=https://v-chat-l3gp.onrender.com
```

### Client

Create `client/.env` with:

```env
VITE_API_URL=http://localhost:4000
```

Production example:

```env
VITE_API_URL=https://v-chat-l3gp.onrender.com
```

## Database Setup

This project expects PostgreSQL tables for users, rooms, messages, reactions, and sessions.

The app automatically adds `rooms.password_hash` if it does not already exist, but it does not create the main tables for you.

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

For production sessions with `connect-pg-simple`, create the session table too:

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



Live frontend: `https://v-chat-smoky.vercel.app/`  
Live backend: `https://v-chat-l3gp.onrender.com/`

## Available Scripts

### Server

- `npm run dev` starts the backend with `nodemon`
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

## Real-Time Events

Socket.IO connection requires a JWT token in `socket.auth.token`.

Main events:

- `join_room`
- `send_message`
- `add_reaction`
- `typing`
- `stop_typing`
- `new_message`
- `reaction_updated`
- `user_joined`
- `user_left`
- `user_typing`
- `user_stop_typing`

## Production Notes

- Set all secrets through your deployment provider's environment settings.
- Use a strong `JWT_SECRET` and a different strong `SESSION_SECRET`.
- Set `CLIENT_URL=https://v-chat-smoky.vercel.app` and `BASE_URL=https://v-chat-l3gp.onrender.com` on the backend.
- This app now uses PostgreSQL session storage instead of the default in-memory session store.
- Set `VITE_API_URL=https://v-chat-l3gp.onrender.com` on the frontend.

## Known Gaps

- There is no migration system yet for creating the main database schema.
- Google OAuth requires valid callback URLs configured in Google Cloud.
- The backend currently assumes the required tables already exist.

## License

ISC
