export function money(minor: number | null | undefined, cur = 'UZS'): string {
  if (minor == null) return '—';
  return (minor / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ' + cur;
}
export function num(v: number | string): string {
  return Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 3 });
}
export function dt(v: string | Date): string {
  return new Date(v).toLocaleString('ru-RU');
}
export function fmtDate(v: string | Date): string {
  return new Date(v).toLocaleDateString('ru-RU');
}
