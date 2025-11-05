import { NextRequest, NextResponse } from 'next/server';
import { setWebhook } from '@lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const base = process.env.PUBLIC_BASE_URL || 'https://agentic-7a32c99e.vercel.app';
  if (!process.env.TELEGRAM_BOT_TOKEN || !secret) {
    return NextResponse.json({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET' }, { status: 400 });
  }
  const webhookUrl = `${base}/api/telegram?secret=${encodeURIComponent(secret)}`;
  await setWebhook(webhookUrl, secret);
  return NextResponse.json({ ok: true, webhookUrl });
}
