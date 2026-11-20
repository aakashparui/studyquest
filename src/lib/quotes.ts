/** Short, non-saccharine lines. One per day, rotating by day-of-year. */
const QUOTES: string[] = [
  'Small progress is still progress.',
  'Discipline beats motivation.',
  'One focused hour can change your day.',
  'Start before you feel ready.',
  'The work you avoid is usually the work that counts.',
  'Slow is smooth. Smooth is fast.',
  'You do not need more time. You need fewer tabs.',
  'Finish the page you are on.',
  'Consistency compounds quietly.',
  'Hard now, easy later.',
  'Your future self is watching.',
  'Confusion is the first step of understanding.',
  'Depth over speed.',
  'Show up, even at half strength.',
  'The timer does not care how you feel. Start it.',
  'Learning is repetition with attention.',
  'Make the next 25 minutes count. That is all.',
  'Rest is part of the work.',
  'Don’t break the chain.',
  'Clarity comes from doing, not planning.',
  'One subject. One goal. One timer.',
  'Quiet effort outlasts loud intentions.',
  'You are allowed to be bad at it while you learn.',
  'Progress hides in boring repetitions.',
  'Close the loop before opening a new one.',
  'A messy start still beats a perfect delay.',
  'Attention is the whole game.',
  'Notes you revisit are worth ten you don’t.',
  'The streak is a side effect, not the point.',
  'Study like it is already yours.',
  'Pick the hardest thing first.',
  'Effort you can repeat tomorrow is the right amount.',
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function quoteOfTheDay(date: Date = new Date()): string {
  const index = (dayOfYear(date) + date.getFullYear()) % QUOTES.length;
  return QUOTES[index] ?? QUOTES[0] ?? '';
}
