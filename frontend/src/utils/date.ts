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
export function getStatusBucket(
  dateStr?: string | null,
  todayIST?: string,
): "overdue" | "today" | "upcoming" {
  if (!dateStr) return "upcoming";
  const followUp = String(dateStr).split("T")[0]; // strip time if present
  const today    = todayIST || getISTDateString();

  if (followUp < today)  return "overdue";
  if (followUp === today) return "today";
  return "upcoming";
}
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