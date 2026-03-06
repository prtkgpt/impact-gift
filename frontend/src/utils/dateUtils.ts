/**
 * Parse a date string (YYYY-MM-DD) as a local date without timezone conversion
 * This prevents the common issue where "2026-03-31" becomes "2026-03-30" due to UTC conversion
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }

  // Split the date string to get year, month, day
  const parts = dateString.split('T')[0].split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);

  // Create date in local timezone
  return new Date(year, month, day);
}
