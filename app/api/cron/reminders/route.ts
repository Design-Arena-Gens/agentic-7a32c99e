import { NextResponse } from 'next/server';
import { listAllUserIds, getTasks, setTasks, getUserProfile } from '@lib/storage';
import { sendMessage } from '@lib/telegram';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = DateTime.now().setZone('Asia/Kolkata');
  const users = await listAllUserIds();
  for (const userId of users) {
    const tasks = await getTasks(userId);
    if (!tasks.length) continue;
    const profile = await getUserProfile(userId);
    if (!profile) continue;
    const chatId = profile.chatId;

    let changed = false;
    for (const t of tasks) {
      if (!t.dueIso || t.status !== 'open') continue;
      const due = DateTime.fromISO(t.dueIso).setZone('Asia/Kolkata');
      const early = due.minus({ minutes: 30 });

      if (!t.earlyReminderSent && now >= early && now < due) {
        await sendMessage(chatId, `Heads up in 30m: ${t.title} ? at ${due.toFormat('h:mm a')}`);
        t.earlyReminderSent = true;
        changed = true;
      }
      if (!t.dueReminderSent && now >= due && now < due.plus({ minutes: 10 })) {
        await sendMessage(chatId, `Due now: ${t.title} ?`);
        t.dueReminderSent = true;
        changed = true;
      }
    }
    if (changed) await setTasks(userId, tasks);
  }
  return NextResponse.json({ ok: true, ranAt: now.toISO() });
}
