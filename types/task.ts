import { DateTime } from 'luxon';

export type TaskStatus = 'open' | 'done';
export type TaskPriority = 'high' | 'normal';

export interface TaskItem {
  id: string; // per-user unique
  title: string;
  dueIso?: string; // ISO in IST
  tags: string[];
  priority: TaskPriority;
  status: TaskStatus;
  createdIso: string; // ISO in IST
  earlyReminderSent?: boolean; // for 30-min early reminders
  dueReminderSent?: boolean;
}

export interface UserProfile {
  userId: number;
  chatId: number;
  timezone: string; // e.g., 'Asia/Kolkata'
}

export function nowIst(): DateTime {
  return DateTime.now().setZone('Asia/Kolkata');
}
