export function emptyDomain(module: string, message: string) {
  return { module, records: [], total: 0, message, generatedAt: new Date().toISOString() };
}
