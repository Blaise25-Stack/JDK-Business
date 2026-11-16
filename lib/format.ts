export function formatFC(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FC`;
}

export function todayISO(): string {
  // Fuseau horaire Africa/Kinshasa
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Kinshasa' });
}

export function formatDateFR(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
