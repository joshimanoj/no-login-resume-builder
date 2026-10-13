/** Month and year entered in two boxes (a month list and a 4-digit year), stored as "2023-07". */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2023-07" to { month: "07", year: "2023" }. */
export const splitMonth = (iso: string) => ({ month: iso.slice(5, 7), year: iso.slice(0, 4) });

/** The two boxes to "2023-07", or a friendly error. */
export function joinMonth(month: string, year: string): { value: string } | { error: string } {
  if (!month) return { error: "Choose the month." };
  if (!/^\d{4}$/.test(year)) return { error: "Type the year as 4 numbers, like 2023." };
  const y = Number(year);
  if (y < 1950 || y > 2100) return { error: "Check the year." };
  return { value: `${year}-${month}` };
}
