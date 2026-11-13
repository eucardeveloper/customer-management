/**
 * Prepares stored values (names, product names, statuses) for the DATA block of the assistant's prompt.
 * Control characters and newlines are removed so a stored value cannot start a new line of "instructions".
 */
export function clean(value: unknown, max = 80): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, max);
}
