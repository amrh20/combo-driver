/** Formats amounts with Latin digits for clearer readability. */
export function formatMoney(value: number): string {
  const formatted = new Intl.NumberFormat('en-EG', {
    maximumFractionDigits: 0,
  }).format(value);

  return `${formatted} ج.م`;
}

/** Formats plain numbers (counts, distances, etc.) with Latin digits. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-EG', options).format(value);
}
