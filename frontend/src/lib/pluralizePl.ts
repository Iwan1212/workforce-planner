/**
 * Polish pluralization following CLDR plural rules.
 * - one:  n === 1
 * - few:  n % 10 in 2..4 and n % 100 not in 12..14 (e.g. 2, 23, 104)
 * - many: everything else (e.g. 0, 5, 12, 25, 112)
 */
export function pluralizePl(
  count: number,
  forms: [one: string, few: string, many: string]
): string {
  const [one, few, many] = forms;
  if (count === 1) return one;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
