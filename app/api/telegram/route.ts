import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getFileUrl, sendMessage } from '@lib/telegram';
import { parseTasksFromText, formatTaskShort } from '@lib/parser';
import { getTasks, setTasks, upsertUserProfile, indexUserId } from '@lib/storage';
import { nowIst } from '@types/task';
import { transcribeOggOpusFromUrl } from '@lib/transcribe';

export const dynamic = 'force-dynamic';

function isValidSecret(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  return !!expected && secret === expected;
}

async function handleTextMessage(chatId: number, userId: number, text: string) {
  const tasks = parseTasksFromText(text, userId);
  const existing = await getTasks(userId);
  const newTasks = [...existing, ...tasks];
  await setTasks(userId, newTasks);
  await upsertUserProfile({ userId, chatId, timezone: 'Asia/Kolkata' });
  await indexUserId(userId);
  const lines = tasks.map((t) => `Task added: ${t.title} ? ${t.dueIso ? DateTime.fromISO(t.dueIso).setZone('Asia/Kolkata').toFormat('ccc h:mm a') : 'no due time'} ?`);
  await sendMessage(chatId, lines.join('\n'));
}

async function handleCommand(chatId: number, userId: number, text: string) {
  const [cmd, ...rest] = text.trim().split(/\s+/);
  const arg = rest.join(' ');
  const tasks = await getTasks(userId);
  if (cmd === '/add') {
    const newOnes = parseTasksFromText(arg, userId);
    await setTasks(userId, [...tasks, ...newOnes]);
    await sendMessage(chatId, newOnes.map((t) => `Task added: ${t.title} ? ${t.dueIso ? DateTime.fromISO(t.dueIso).setZone('Asia/Kolkata').toFormat('ccc h:mm a') : 'no due time'} ?`).join('\n'));
    return;
  }
  if (cmd === '/next') {
    const open = tasks.filter((t) => t.status === 'open');
    open.sort((a, b) => (a.dueIso ?? '').localeCompare(b.dueIso ?? ''));
    await sendMessage(chatId, open.slice(0, 5).map((t) => formatTaskShort(t)).join('\n') || 'No open tasks.');
    return;
  }
  if (cmd === '/today') {
    const today = nowIst().toISODate();
    const list = tasks.filter((t) => t.dueIso && DateTime.fromISO(t.dueIso).setZone('Asia/Kolkata').toISODate() === today);
    await sendMessage(chatId, list.map((t) => formatTaskShort(t)).join('\n') || 'Nothing due today.');
    return;
  }
  if (cmd === '/done') {
    const id = rest[0];
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      tasks[idx].status = 'done';
      await setTasks(userId, tasks);
      await sendMessage(chatId, `Marked done: ${tasks[idx].title} ?`);
    } else {
      await sendMessage(chatId, `Task not found: ${id}`);
    }
    return;
  }
  if (cmd === '/snooze') {
    const id = rest[0];
    const durStr = rest[1] ?? '60m';
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      const m = durStr.match(/(\d+)([mh])/i);
      const mins = m ? (m[2].toLowerCase() === 'h' ? parseInt(m[1]) * 60 : parseInt(m[1])) : 60;
      const from = tasks[idx].dueIso ? DateTime.fromISO(tasks[idx].dueIso).setZone('Asia/Kolkata') : nowIst();
      const next = from.plus({ minutes: mins });
      tasks[idx].dueIso = next.toISO();
      tasks[idx].earlyReminderSent = false;
      tasks[idx].dueReminderSent = false;
      await setTasks(userId, tasks);
      await sendMessage(chatId, `Snoozed: ${tasks[idx].title} ? to ${next.toFormat('ccc h:mm a')}`);
    } else {
      await sendMessage(chatId, `Task not found: ${id}`);
    }
    return;
  }
  if (cmd === '/list') {
    await sendMessage(chatId, tasks.map((t) => formatTaskShort(t)).join('\n') || 'No tasks.');
    return;
  }
  if (cmd === '/help') {
    await sendMessage(chatId, `Commands:\n/add <task details>\n/next\n/today\n/done <id>\n/snooze <id> <2h|30m>\n`);
    return;
  }
  // Fallback: treat as add
  await handleTextMessage(chatId, userId, text);
}

export async function POST(request: NextRequest) {
  if (!isValidSecret(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const update = await request.json();
  const msg = update.message || update.edited_message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat?.id;
  const userId = msg.from?.id;
  if (!chatId || !userId) return NextResponse.json({ ok: true });

  // Persist user profile/index
  await upsertUserProfile({ userId, chatId, timezone: 'Asia/Kolkata' });
  await indexUserId(userId);

  if (msg.text) {
    const text: string = msg.text.trim();
    if (/^\//.test(text)) {
      await handleCommand(chatId, userId, text);
    } else {
      // natural language add
      await handleTextMessage(chatId, userId, text);
    }
  } else if (msg.voice) {
    const fileId: string = msg.voice.file_id;
    const url = await getFileUrl(fileId);
    if (!url) {
      await sendMessage(chatId, 'Could not download voice note.');
      return NextResponse.json({ ok: true });
    }
    const text = await transcribeOggOpusFromUrl(url);
    if (!text) {
      await sendMessage(chatId, 'Transcription unavailable. Please try text for now.');
      return NextResponse.json({ ok: true });
    }
    await handleTextMessage(chatId, userId, text);
  } else {
    await sendMessage(chatId, 'Send a task or voice note. Try /help');
  }

  return NextResponse.json({ ok: true });
}
