import chrono from 'chrono-node';
import { DateTime } from 'luxon';
import { TaskItem, TaskPriority, nowIst } from '@types/task';

const TAG_KEYWORDS: Record<string, string[]> = {
  call: ['call', 'phone', 'ring', 'dial'],
  payment: ['pay', 'payment', 'bill', 'rent', 'invoice'],
  work: ['work', 'meeting', 'meet', 'email', 'review', 'submit', 'report'],
  personal: ['buy', 'groceries', 'gym', 'exercise', 'meditate', 'walk'],
  reminder: ['remind', 'remember'],
};

function inferTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags = new Set<string>();
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) tags.add(tag);
  }
  // Names heuristic - if "call NAME" then add tag "call"
  if (/\bcall\b/i.test(text)) tags.add('call');
  return Array.from(tags);
}

function inferPriority(text: string): TaskPriority {
  const lower = text.toLowerCase();
  if (/(urgent|asap|important|priority|critical|high)/.test(lower)) return 'high';
  return 'normal';
}

function splitIntoPotentialTasks(input: string): string[] {
  // Split by common conjunctions indicating multiple tasks
  // e.g., "Buy groceries after work today and call Mini at 10 AM tomorrow"
  const parts = input
    .split(/\b(?: and | & | then |;|\n)+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [input.trim()];
}

export function parseTasksFromText(text: string, userId: number): TaskItem[] {
  const now = nowIst();
  return splitIntoPotentialTasks(text).map((segment, idx) => {
    // Parse date/time with chrono in IST
    const parsed = chrono
      .casual
      .parse(segment, now.toJSDate(), { forwardDate: true });

    // Default times for vague phrases
    let due: DateTime | undefined;
    if (parsed.length > 0) {
      const comp = parsed[0].start?.date();
      if (comp) due = DateTime.fromJSDate(comp, { zone: 'Asia/Kolkata' });
    } else {
      // Heuristics: if contains 'tomorrow', set 9 AM; if 'today', set 7 PM; else undefined
      const lower = segment.toLowerCase();
      if (lower.includes('tomorrow')) {
        due = now.plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
      } else if (lower.includes('today')) {
        due = now.set({ hour: 19, minute: 0, second: 0, millisecond: 0 });
      }
    }

    // If user writes "tomorrow morning" map to 9 AM, "evening" to 7 PM, "noon" 12, "afternoon" 3 PM
    if (due && /morning/i.test(segment)) due = due.set({ hour: 9, minute: 0 });
    if (due && /noon|midday/i.test(segment)) due = due.set({ hour: 12, minute: 0 });
    if (due && /afternoon/i.test(segment)) due = due.set({ hour: 15, minute: 0 });
    if (due && /evening|after work/i.test(segment)) due = due.set({ hour: 19, minute: 0 });

    const title = segment
      .replace(/\b(?:today|tomorrow|morning|noon|afternoon|evening|after work)\b/gi, '')
      .replace(/\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '')
      .trim()
      || segment.trim();

    return {
      id: `${Date.now()}_${idx}`,
      title,
      dueIso: due?.toISO() ?? undefined,
      tags: inferTags(segment),
      priority: inferPriority(segment),
      status: 'open',
      createdIso: now.toISO(),
    } satisfies TaskItem;
  });
}

export function formatTaskShort(task: TaskItem): string {
  const dueStr = task.dueIso ? DateTime.fromISO(task.dueIso).setZone('Asia/Kolkata').toFormat("dd LLL, h:mm a") : 'no due time';
  const tags = task.tags.length ? ` [${task.tags.join(', ')}]` : '';
  const pr = task.priority === 'high' ? '??' : '';
  const status = task.status === 'done' ? '?' : '?';
  return `${status} (${task.id}) ${task.title}${tags} ? ${dueStr} ${pr}`.trim();
}
