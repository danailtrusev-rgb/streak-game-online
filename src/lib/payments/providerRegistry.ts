import type { PaymentConfig } from './paymentTypes';

export interface ProviderAdapter {
  providerKey: string;
  displayName: string;
  isDummy: boolean;
  supportsCreditPurchase: boolean;
  supportsWithdrawal: boolean;
}

const registry: Map<string, ProviderAdapter> = new Map();

export function registerProvider(adapter: ProviderAdapter): void {
  registry.set(adapter.providerKey, adapter);
}

export function getProvider(providerKey: string): ProviderAdapter | undefined {
  return registry.get(providerKey);
}

export function getActivePurchaseProvider(config: PaymentConfig): ProviderAdapter | null {
  const provider = config.active_purchase_provider;
  if (!provider) return null;
  return getProvider(provider.provider_key) ?? {
    providerKey: provider.provider_key,
    displayName: provider.display_name,
    isDummy: provider.provider_key === 'dummy',
    supportsCreditPurchase: provider.supports_credit_purchase,
    supportsWithdrawal: provider.supports_withdrawal,
  };
}

export function getActiveWithdrawalProvider(config: PaymentConfig): ProviderAdapter | null {
  const provider = config.active_withdrawal_provider;
  if (!provider) return null;
  return getProvider(provider.provider_key) ?? {
    providerKey: provider.provider_key,
    displayName: provider.display_name,
    isDummy: provider.provider_key === 'dummy',
    supportsCreditPurchase: provider.supports_credit_purchase,
    supportsWithdrawal: provider.supports_withdrawal,
  };
}

export function isDummyProviderActive(config: PaymentConfig): boolean {
  return config.active_purchase_provider?.provider_key === 'dummy' ||
         config.active_withdrawal_provider?.provider_key === 'dummy';
}

registerProvider({
  providerKey: 'dummy',
  displayName: 'Dummy Payment Provider',
  isDummy: true,
  supportsCreditPurchase: true,
  supportsWithdrawal: true,
});
