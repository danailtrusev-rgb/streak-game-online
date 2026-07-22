export function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function isDummyProvider(providerKey: string): boolean {
  return providerKey === 'dummy';
}

export function shouldShowDummyLabel(providerKey: string | null | undefined): boolean {
  return providerKey === 'dummy';
}
