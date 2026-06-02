/**
 * Generates an IST-safe date string (YYYY-MM-DD) regardless of host timezone settings.
 */
export function getISTDateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60000);

  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


/**
 * Parses local midnight date variables to prevent native engine UTC conversion drops.
 */
export function parseLocalDate(dateStr: string | Date): Date {
  const raw = dateStr instanceof Date
    ? dateStr.toISOString().split("T")[0]
    : String(dateStr).split("T")[0].trim();
  const [y, m, d] = raw.split("-").map(Number);
  return new Date(y, m - 1, d); // local midnight — safe for display only
}
/**
 * Calculates current tracking bucket locations for any parsed entry date configurations.
 */
export const getStatusBucket = (dateStr: string | null | Date, todayStr: string): 'overdue' | 'today' | 'upcoming' => {
  if (!dateStr) return 'upcoming';

  // Extract a clean YYYY-MM-DD string regardless of format type
  let targetDate = "";
  if (dateStr instanceof Date) {
    targetDate = dateStr.toISOString().split('T')[0];
  } else if (String(dateStr).includes('T')) {
    targetDate = String(dateStr).split('T')[0];
  } else {
    // Standardize text formats
    const clean = String(dateStr).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('-');
      targetDate = `${y}-${m}-${d}`;
    } else {
      targetDate = clean;
    }
  }

  if (targetDate < todayStr) return 'overdue';
  if (targetDate === todayStr) return 'today';
  return 'upcoming';
};
/**
 * Returns localized UK standard string date fragments ("06 May") for data visualization columns.
 */
export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const clean = String(dateStr).split("T")[0];
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}