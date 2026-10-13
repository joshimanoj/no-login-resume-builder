/** Month-and-year entry typed as numbers ("07 / 2023"), stored as "2023-07". */

/**
 * "07 / 2023" as she types digits. The slash appears once she starts the year, so backspace
 * never gets stuck on it. A slash typed after one digit pads the month ("7/" becomes "07").
 */
export function formatMonthInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (/^\d\s*\//.test(raw.trim())) digits = `0${digits}`;
  digits = digits.slice(0, 6);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

/** "07 / 2023" to "2023-07", or an error message. */
export function parseMonthInput(text: string): { value: string } | { error: string } {
  const m = text.match(/^(\d{2}) \/ (\d{4})$/);
  if (!m) return { error: "Type the month and year as numbers, like 07 / 2023." };
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (month < 1 || month > 12) return { error: "The month should be from 01 to 12." };
  if (year < 1950 || year > 2100) return { error: "Check the year." };
  return { value: `${m[2]}-${m[1]}` };
}

export const toMonthInput = (iso: string) => (iso ? `${iso.slice(5, 7)} / ${iso.slice(0, 4)}` : "");
