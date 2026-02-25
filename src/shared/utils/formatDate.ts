const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < MINUTE) return 'just now';
  if (diffSeconds < HOUR) return rtf.format(-Math.floor(diffSeconds / MINUTE), 'minute');
  if (diffSeconds < DAY) return rtf.format(-Math.floor(diffSeconds / HOUR), 'hour');
  if (diffSeconds < WEEK) return rtf.format(-Math.floor(diffSeconds / DAY), 'day');
  if (diffSeconds < MONTH) return rtf.format(-Math.floor(diffSeconds / WEEK), 'week');
  if (diffSeconds < YEAR) return rtf.format(-Math.floor(diffSeconds / MONTH), 'month');
  return rtf.format(-Math.floor(diffSeconds / YEAR), 'year');
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
