/** نوتیفیکیشن مرورگر و صدای آلارم برای یادآوری یادداشت‌ها */

export const NOTES_APP_PATH = '/notes';

export interface NoteReminderPayload {
  id: string;
  title?: string;
  content?: string;
  reminder_date?: string;
  reminder_time?: string;
}

export function getNoteReminderPath(noteId?: string): string {
  if (!noteId) return NOTES_APP_PATH;
  return `${NOTES_APP_PATH}?highlight=${encodeURIComponent(noteId)}`;
}

export async function requestNoteNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function showNoteBrowserNotification(
  note: NoteReminderPayload,
  onClick?: () => void
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = note.title?.trim() || 'یادآوری یادداشت';
  const body = (note.content?.trim() || 'زمان انجام این کار فرا رسیده است.').slice(0, 160);
  const when = [note.reminder_date, note.reminder_time].filter(Boolean).join(' · ');

  try {
    const notification = new Notification(`🔔 ${title}`, {
      body: when ? `${body}\n⏰ ${when}` : body,
      icon: '/favicon.ico',
      tag: `note-reminder-${note.id}`,
      requireInteraction: true,
      silent: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // مرورگر ممکن است در iframe یا بدون مجوز مسدود کند
  }
}

/** آلارم سه‌مرحله‌ای */
export async function playNoteAlarmSound(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) throw new Error('no AudioContext');

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const pulse = (freq: number, start: number, dur: number, vol = 0.35) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    };

    const t0 = ctx.currentTime;
    for (let cycle = 0; cycle < 4; cycle++) {
      const base = t0 + cycle * 0.85;
      pulse(784, base, 0.18, 0.4);
      pulse(988, base + 0.22, 0.18, 0.4);
      pulse(1175, base + 0.44, 0.28, 0.45);
    }

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 4500);
  } catch {
    try {
      const beep = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAD+/wAA'
      );
      beep.volume = 0.85;
      await beep.play();
    } catch {
      // autoplay policy
    }
  }
}

export async function triggerNoteReminderAlert(
  note: NoteReminderPayload,
  onNotificationClick?: () => void
): Promise<void> {
  await playNoteAlarmSound();
  showNoteBrowserNotification(note, onNotificationClick);
}
