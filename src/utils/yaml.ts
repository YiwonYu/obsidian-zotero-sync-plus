export function escapeYamlString(value: string): string {
  return JSON.stringify(value);
}

export function yamlScalar(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '""';
  return escapeYamlString(String(value));
}

export function frontmatterToMarkdown(data: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const entry of value) lines.push(`  - ${yamlScalar(entry)}`);
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}
