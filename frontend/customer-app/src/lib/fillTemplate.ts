// Replaces every {key} in a text with its value; a key without a value stays as written.
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (Object.hasOwn(values, key) ? values[key] : whole));
}
