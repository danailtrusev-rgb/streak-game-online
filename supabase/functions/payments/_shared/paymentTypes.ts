export type PaymentOrderStatus = 'created' | 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired';
export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type ProviderMode = 'sandbox' | 'live';

export interface CreditPackage {
  id: string;
  package_key: string;
  display_name: string;
  amount_cents: number;
  credits_cents: number;
  currency: string;
}

export interface PaymentProviderInfo {
  provider_key: string;
  display_name: string;
  mode: ProviderMode;
  supports_credit_purchase: boolean;
  supports_withdrawal: boolean;
}

export interface PaymentConfig {
  payments_enabled: boolean;
  credit_purchases_enabled: boolean;
  withdrawals_enabled: boolean;
  dummy_payments_enabled: boolean;
  active_purchase_provider: PaymentProviderInfo | null;
  active_withdrawal_provider: PaymentProviderInfo | null;
  credit_packages: CreditPackage[];
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  provider_key: string;
  provider_payment_id: string | null;
  status: PaymentOrderStatus;
  package_id: string | null;
  amount_cents: number;
  credits_cents: number;
  currency: string;
  checkout_url: string | null;
  idempotency_key: string;
  provider_meta: Record<string, unknown>;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  provider_key: string;
  provider_payout_id: string | null;
  status: WithdrawalStatus;
  amount_cents: number;
  currency: string;
  idempotency_key: string;
  destination_type: string | null;
  destination_label: string | null;
  provider_meta: Record<string, unknown>;
  requested_at: string;
  processing_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEventPayload {
  event_id: string;
  event_type: string;
  provider_payment_id?: string;
  provider_payout_id?: string;
  payment_order_id?: string;
  withdrawal_request_id?: string;
  amount_cents?: number;
  currency?: string;
  status?: string;
  failure_reason?: string;
}

export interface CreateCreditOrderRequest {
  package_key: string;
}

export interface CreateWithdrawalRequest {
  amount_cents: number;
  destination_type?: string;
  destination_label?: string;
}

export interface SimulatePaymentRequest {
  order_id: string;
  outcome: 'succeeded' | 'failed';
}

export interface SimulatePayoutRequest {
  withdrawal_id: string;
  outcome: 'paid' | 'failed';
}
