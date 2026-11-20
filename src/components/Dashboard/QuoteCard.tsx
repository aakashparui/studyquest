import type { ReactElement } from 'react';
import { Quote } from 'lucide-react';
import { quoteOfTheDay } from '../../lib/quotes';

export function QuoteCard({ day }: { day: string }): ReactElement {
  // `day` is only here so the quote refreshes when the date rolls over.
  const text = quoteOfTheDay(new Date(`${day}T12:00:00`));
  return (
    <section
      className="glass flex items-start gap-3 rounded-3xl p-4 sm:p-5"
      aria-label="Quote of the day"
    >
      <Quote size={18} className="mt-0.5 shrink-0 text-brand-soft" aria-hidden />
      <p className="text-sm leading-relaxed font-medium text-ink-soft italic">{text}</p>
    </section>
  );
}
