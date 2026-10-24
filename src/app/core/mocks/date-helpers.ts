/** Arabic display string for history rows (date + time). */
export function formatArabicDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Arabic display string for shift session dates. */
export function formatArabicDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
