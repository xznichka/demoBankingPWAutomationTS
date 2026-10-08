const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type MonthName = (typeof MONTHS)[number];

/** Formats a date as MM-DD-YYYY, the format ParaBank shows and searches by. */
export function formatDate(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${date.getFullYear()}`;
}

/** Month name for `date`, or `offset` months away from it. */
export function monthName(date: Date = new Date(), offset = 0): MonthName {
  return MONTHS[(((date.getMonth() + offset) % 12) + 12) % 12];
}
