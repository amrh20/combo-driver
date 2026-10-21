/** Formats integer piastres (1 EGP = 100) with Latin digits. */
export function formatPiastres(piastres: number): string {
  const egp = piastres / 100;
  const formatted = new Intl.NumberFormat('en-EG', {
    minimumFractionDigits: Number.isInteger(egp) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(egp);

  return `${formatted} ج.م`;
}

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
