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

/**
 * Format a time string (HH:MM or HH:MM:SS) to 12-hour format with AM/PM
 * @param timeString - Time in 24-hour format (e.g., "18:27:00" or "18:27")
 * @returns Formatted time in 12-hour format (e.g., "6:27 PM")
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '';

  // Parse the time string
  const parts = timeString.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];

  // Determine AM/PM
  const period = hours >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  hours = hours % 12 || 12; // Convert 0 to 12 for midnight, 13-23 to 1-11

  return `${hours}:${minutes} ${period}`;
}
