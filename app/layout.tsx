import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskBot for Telegram',
  description: 'Telegram task manager with voice transcription and reminders',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
