import Link from 'next/link';

export default function Page() {
  return (
    <div className="container">
      <div className="card">
        <h1>TaskBot for Telegram</h1>
        <p className="muted">A simple Telegram bot that captures tasks from text or voice, schedules reminders, and sends your daily to?do at 8:00 AM IST.</p>
        <ul>
          <li>Set your Telegram webhook to <code>/api/telegram</code> with a secret query param.</li>
          <li>Provide environment variables in Vercel for Telegram, KV, and OpenAI.</li>
          <li>Vercel Cron triggers reminders and daily digest automatically.</li>
        </ul>
        <p>Health check: <Link href="/api/health">/api/health</Link></p>
      </div>
    </div>
  );
}
