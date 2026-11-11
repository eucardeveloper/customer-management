/**
 * The audit rows carry the server's clock as a plain timestamp ("2026-11-11T13:17:42.451037") with no
 * zone. The services run in UTC, so read it as UTC instead of the browser's local time; otherwise a user in
 * Istanbul would see every entry three hours early.
 */
export function parseServerUtc(value: string): Date {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}
