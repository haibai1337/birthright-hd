// Code-unit order is identical across locales and runtimes for validated ASCII IDs.
export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
