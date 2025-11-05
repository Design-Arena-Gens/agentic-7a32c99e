import { DateTime } from 'luxon';
import { TaskItem } from '@types/task';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendMessage(chatId: number, text: string, opts?: { parseMode?: 'Markdown' | 'HTML' }) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: opts?.parseMode,
    disable_web_page_preview: true,
  };
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function setWebhook(url: string, secretToken: string) {
  await fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, secret_token: secretToken, drop_pending_updates: false }),
  });
}

export async function getFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`${API}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const filePath = data?.result?.file_path;
  if (!filePath) return null;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}

export function formatTaskList(tasks: TaskItem[]): string {
  if (tasks.length === 0) return 'No tasks found. ??';
  const lines = tasks.map((t) => {
    const due = t.dueIso ? DateTime.fromISO(t.dueIso).setZone('Asia/Kolkata').toFormat('ccc dd LLL, h:mm a') : 'no due time';
    const check = t.status === 'done' ? '?' : '?';
    const pr = t.priority === 'high' ? '??' : '';
    return `${check} ${t.id}: ${t.title} ? ${due} ${pr}`.trim();
  });
  return lines.join('\n');
}
