export function applyTemplate(tpl: string, values: Record<string, unknown>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (Object.hasOwn(values, key) ? String(values[key]) : ''));
}
