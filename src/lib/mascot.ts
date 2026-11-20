export type MascotMood =
  | 'idle'
  | 'start'
  | 'quarter'
  | 'half'
  | 'final'
  | 'paused'
  | 'complete'
  | 'break'
  | 'breakEnd'
  | 'hotStreak'
  | 'abandoned'
  | 'levelUp';

const POOLS: Record<MascotMood, string[]> = {
  idle: [
    'Pick a subject and I’ll start the clock. 🎯',
    'Ready when you are. One session is enough to start. ✨',
    'Nothing on the board yet today. Let’s fix that. 📘',
    'Choose the hardest thing first. I’ll keep time. ⏳',
    'I’ve got the timer. You’ve got the brain. 🧠',
  ],
  start: [
    'Let’s get this done. No excuses. 😤',
    'Timer’s running. Phone face down. 📵',
    'Deep breath. One thing only for the next stretch. 🌬',
    'Locked in. I’ll tell you when it’s over. 🔒',
    'This is the easy part — just don’t stop. 🚀',
  ],
  quarter: [
    'Warmed up. Keep the rhythm. 🎵',
    'Good start. Don’t go looking for distractions. 👀',
    'You’re in it now. Stay here. 🧷',
  ],
  half: [
    'You’re halfway there. Keep going! 🔥',
    'Halfway. The second half is where it counts. 💪',
    'Momentum achieved. Don’t waste it. ⚙️',
    'Half down. This one’s yours already. 🧗',
  ],
  final: [
    'Final push! You’ve got this. 🏁',
    'Last few minutes — finish the thought. ✍️',
    'Almost there. Don’t coast now. ⚡',
    'Close it out strong. 🥊',
  ],
  paused: [
    'Paused. Come back when you’re ready. ⏸',
    'Breather taken. The timer is waiting. 🫧',
    'No judgement — just press start again. 🔁',
  ],
  complete: [
    'Mission complete! 🎉',
    'That’s another one banked. 🏦',
    'Clean session. Logged and counted. ✅',
    'Well held. That’s how it’s done. 👏',
    'Session down. Your streak thanks you. 🔥',
  ],
  break: [
    'Break earned. Stand up, actually stand up. 🧍',
    'Water. Window. Shoulders. In that order. 💧',
    'Rest properly so the next one lands. ☕',
    'Look at something twenty feet away. 👁',
  ],
  breakEnd: [
    'Break’s over. Back to it. 🔙',
    'Refreshed? Good. Next session. ▶️',
    'That’s enough rest to be useful. Let’s go. 🧭',
  ],
  hotStreak: [
    'You’re on fire today! 🔥',
    'Multiple sessions deep — this is a good day. 🌟',
    'Whatever you’re doing, keep doing it. 📈',
    'This is what a productive day looks like. 🗿',
  ],
  abandoned: [
    'Dropped that one. It happens — reset and go. 🌿',
    'Combo gone, progress kept. Start another. 🧩',
    'No spiral. Just start the next session. 🔄',
  ],
  levelUp: [
    'Level up! You earned every point of that. 🆙',
    'New level unlocked. Onwards. 🪜',
    'That’s a rank up. Not bad at all. 🎖',
  ],
};

/**
 * Picks a line, avoiding anything in `recent` so the same message doesn't
 * repeat back to back.
 */
export function mascotMessage(
  mood: MascotMood,
  recent: readonly string[] = [],
  random: () => number = Math.random,
): string {
  const pool = POOLS[mood] ?? POOLS.idle;
  const fresh = pool.filter((line) => !recent.includes(line));
  const candidates = fresh.length > 0 ? fresh : pool;
  const index = Math.floor(random() * candidates.length);
  return candidates[index] ?? candidates[0] ?? '';
}

export const BREAK_TIPS: string[] = [
  'Stand up and stretch your shoulders',
  'Drink a glass of water',
  'Walk around for a minute',
  'Look away from the screen — 20 feet, 20 seconds',
  'Roll your wrists and neck',
  'Open a window or step outside',
  'Tidy one thing on your desk',
  'Breathe slowly for ten counts',
];

export function pickBreakTips(count = 3, seed = Date.now()): string[] {
  const tips = [...BREAK_TIPS];
  const picked: string[] = [];
  let cursor = seed;
  while (picked.length < count && tips.length > 0) {
    cursor = (cursor * 1103515245 + 12345) & 0x7fffffff;
    const index = cursor % tips.length;
    picked.push(tips.splice(index, 1)[0] as string);
  }
  return picked;
}
