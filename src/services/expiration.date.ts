export function getCustomExpiration(days: number): string {
  const date = new Date(); // Current date & time
  
  // Add days to the current date
  date.setDate(date.getDate() + days);
  
  // Convert to ISO string for PostgreSQL
  return date.toISOString();
}