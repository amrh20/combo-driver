/** Formats integer piastres (1 EGP = 100) with Latin digits. */
export function formatPiastres(piastres: number): string {
  const egp = piastres / 100;
  const formatted = new Intl.NumberFormat('en-EG', {
    minimumFractionDigits: Number.isInteger(egp) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(egp);

  return `${formatted} ج.م`;
}

/** Converts integer piastres from the API into EGP. */
export function piastresToEgp(piastres: number): number {
  return Number.isFinite(piastres) ? piastres / 100 : 0;
}

/** Formats EGP amounts with Latin digits. Whole pounds stay integers; piastre remainders keep two decimals. */
export function formatMoney(value: number): string {
  const formatted = new Intl.NumberFormat('en-EG', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${formatted} ج.م`;
}

/** Formats plain numbers (counts, distances, etc.) with Latin digits. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-EG', options).format(value);
}
