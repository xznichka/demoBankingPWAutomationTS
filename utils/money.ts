/** Turns "$1,515.50" or "-$100.00" into a number of dollars. */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[$,\s]/g, '');
  const value = Number(cleaned);
  if (cleaned === '' || Number.isNaN(value)) {
    throw new Error(`Not a money value: "${text}"`);
  }
  return value;
}

/** Converts dollars to whole cents, so comparisons are exact. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
