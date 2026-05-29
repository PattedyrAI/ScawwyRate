const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

function relativeUnit(value: number, unit: string): string {
  if (value === 1) return `1 ${unit} ago`;
  return `${value} ${unit}s ago`;
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < MINUTE) return 'just now';
  if (diffSeconds < HOUR) return relativeUnit(Math.floor(diffSeconds / MINUTE), 'minute');
  if (diffSeconds < DAY) return relativeUnit(Math.floor(diffSeconds / HOUR), 'hour');
  if (diffSeconds < WEEK) return relativeUnit(Math.floor(diffSeconds / DAY), 'day');
  if (diffSeconds < MONTH) return relativeUnit(Math.floor(diffSeconds / WEEK), 'week');
  if (diffSeconds < YEAR) return relativeUnit(Math.floor(diffSeconds / MONTH), 'month');
  return relativeUnit(Math.floor(diffSeconds / YEAR), 'year');
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
