import { kv } from '@vercel/kv';
import { promises as fs } from 'fs';
import path from 'path';
import { TaskItem, UserProfile } from '@types/task';

const USE_KV = !!process.env.KV_REST_API_URL;
const DEV_DB_PATH = path.join(process.cwd(), 'data', 'dev-db.json');

type DbShape = {
  users: Record<string, UserProfile>;
  tasks: Record<string, TaskItem[]>; // key by userId
};

async function ensureDevDb(): Promise<DbShape> {
  const dir = path.dirname(DEV_DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    const raw = await fs.readFile(DEV_DB_PATH, 'utf-8');
    return JSON.parse(raw) as DbShape;
  } catch {
    const initial: DbShape = { users: {}, tasks: {} };
    await fs.writeFile(DEV_DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

async function saveDevDb(db: DbShape) {
  await fs.writeFile(DEV_DB_PATH, JSON.stringify(db, null, 2));
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  if (USE_KV) {
    return (await kv.get<UserProfile>(`user:${userId}`)) ?? null;
  }
  const db = await ensureDevDb();
  return db.users[String(userId)] ?? null;
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  if (USE_KV) {
    await kv.set(`user:${profile.userId}`, profile);
    return;
  }
  const db = await ensureDevDb();
  db.users[String(profile.userId)] = profile;
  await saveDevDb(db);
}

export async function getTasks(userId: number): Promise<TaskItem[]> {
  if (USE_KV) {
    return (await kv.get<TaskItem[]>(`tasks:${userId}`)) ?? [];
  }
  const db = await ensureDevDb();
  return db.tasks[String(userId)] ?? [];
}

export async function setTasks(userId: number, tasks: TaskItem[]): Promise<void> {
  if (USE_KV) {
    await kv.set(`tasks:${userId}`, tasks);
    return;
  }
  const db = await ensureDevDb();
  db.tasks[String(userId)] = tasks;
  await saveDevDb(db);
}

export async function listAllUserIds(): Promise<number[]> {
  if (USE_KV) {
    // Fallback: store an index of user ids for scanning
    const ids = (await kv.smembers<string>('user:index')) ?? [];
    return ids.map((s) => Number(s));
  }
  const db = await ensureDevDb();
  return Object.keys(db.users).map((s) => Number(s));
}

export async function indexUserId(userId: number) {
  if (USE_KV) {
    await kv.sadd('user:index', String(userId));
  }
}
