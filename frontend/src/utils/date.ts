/**
 * Generates an IST-safe date string (YYYY-MM-DD) regardless of host timezone settings.
 */
export const getISTDateString = () => {
  const now    = new Date();
  const utcMs  = now.getTime() + now.getTimezoneOffset() * 60_000;
  const istMs  = utcMs + 5.5 * 60 * 60_000;
  const ist    = new Date(istMs);
  const y      = ist.getFullYear();
  const m      = String(ist.getMonth() + 1).padStart(2, '0');
  const d      = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};


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
export const getStatusBucket = (dateStr: string | null | Date, todayStr?: string): 'overdue' | 'today' | 'upcoming' => {
  if (!dateStr) return 'upcoming';
  
  const referenceToday = todayStr || getISTDateString();
  
  // Extract absolute text value YYYY-MM-DD directly to completely bypass browser timezone offsets
  let targetDate = "";
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    targetDate = `${y}-${m}-${d}`;
  } else {
    const clean = String(dateStr).trim();
    if (clean.includes('T')) {
      targetDate = clean.split('T')[0];
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [day, month, year] = clean.split('-');
      targetDate = `${year}-${month}-${day}`;
    } else {
      targetDate = clean;
    }
  }

  if (targetDate < referenceToday) return 'overdue';
  if (targetDate === referenceToday) return 'today';
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