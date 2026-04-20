import type { Message as ChatMessage } from '../types';

interface MessageProps {
  message: ChatMessage;
  currentUsername?: string;
  onReact: (messageId: number | string, emoji: string) => void;
}

const EMOJIS = ['👍', '❤️', '😂', '🔥'];

export default function Message({ message, currentUsername, onReact }: MessageProps) {
  if (message.kind === 'system') {
    return (
      <p className="m-0 self-center rounded-full bg-slate-200 px-3 py-2 text-sm text-slate-600">
        {message.content}
      </p>
    );
  }

  const isOwnMessage = currentUsername === message.username;
  const reactions = message.reactions || [];

  return (
    <article
      className={[
        'rounded-[18px] border px-4 py-4 text-left',
        isOwnMessage
          ? 'border-emerald-200 bg-emerald-100'
          : 'border-slate-200 bg-slate-50',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <strong>{message.username}</strong>
          <p className="mb-0 mt-1 text-[0.85rem] text-slate-500">
            {new Date(message.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <p className="my-3 whitespace-pre-wrap text-slate-900">{message.content}</p>

      <div className="flex min-h-7 flex-wrap gap-2">
        {reactions.map((reaction, index) => (
          <span
            key={reaction.emoji + reaction.user_id + index}
            className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-200 px-2 py-1"
          >
            {reaction.emoji}
          </span>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1.5 transition hover:bg-slate-100"
            onClick={() => onReact(message.id, emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </article>
  );
}
