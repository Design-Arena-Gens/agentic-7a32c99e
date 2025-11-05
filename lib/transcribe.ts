import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function transcribeOggOpusFromUrl(url: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const file = new File([buf], 'audio.ogg', { type: 'audio/ogg' });
  const tr = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'json',
    temperature: 0.2,
  } as any);
  // openai sdk typing can lag; coerced above
  const text = (tr as any)?.text as string | undefined;
  return text ?? null;
}
