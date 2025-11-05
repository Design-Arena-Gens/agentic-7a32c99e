import { NextResponse } from 'next/server';
import { listAllUserIds, getTasks, getUserProfile } from '@lib/storage';
import { sendMessage } from '@lib/telegram';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = DateTime.now().setZone('Asia/Kolkata');
  const today = now.toISODate();
  const users = await listAllUserIds();
  for (const userId of users) {
    const tasks = await getTasks(userId);
    const profile = await getUserProfile(userId);
    if (!profile) continue;
    const chatId = profile.chatId;
    const todayTasks = tasks.filter((t) => t.status === 'open' && t.dueIso && DateTime.fromISO(t.dueIso).setZone('Asia/Kolkata').toISODate() === today);
    const lines = todayTasks.length
      ? todayTasks
          .sort((a, b) => (a.dueIso ?? '').localeCompare(b.dueIso ?? ''))
          .map((t) => {
            const due = t.dueIso ? DateTime.fromISO(t.dueIso).setZone('Asia/Kolkata').toFormat('h:mm a') : 'anytime';
            return `? ${t.title} ? ${due}`;
          })
          .join('\n')
      : 'Nothing due today. ?';
    await sendMessage(chatId, `Good morning! Here is your to?do for today:\n\n${lines}`);
  }
  return NextResponse.json({ ok: true });
}
