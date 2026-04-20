// what a user looks like
export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

// what a room looks like
export interface Room {
  id: number;
  name: string;
  description: string | null;
  creator: string;
  message_count: number;
  created_at: string;
  is_protected?: boolean;
}

// what a reaction looks like
export interface Reaction {
  emoji: string;
  user_id: number;
}

export interface OnlineUser {
  userId: string;
  username: string;
}

// what a message looks like
export interface Message {
  id: number | string;
  content: string;
  username: string;
  avatar: string | null;
  created_at: string;
  reactions: Reaction[] | null;
  kind?: 'user' | 'system';
}

// what comes back from login/register
export interface AuthResponse {
  user: User;
  token: string;
}
