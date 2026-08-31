import "server-only";

export type PaymentProviderCode = string;

export type CreatePaymentSessionInput = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: string;
  currencyCode: string;
  idempotencyKey: string;
  returnUrl: string;
};

export type CreatePaymentSessionResult = {
  providerCode: PaymentProviderCode;
  providerReference: string;
  checkoutUrl?: string;
  clientSecret?: string;
  expiresAt?: string;
};

export type VerifiedProviderEvent = {
  providerCode: PaymentProviderCode;
  providerEventId: string;
  providerReference: string;
  status: "pending" | "succeeded" | "failed" | "expired" | "cancelled";
  amount?: string;
  currencyCode?: string;
};

export type VerifyProviderWebhookInput = {
  rawBody: string;
  headers: Headers;
};

export type RefundPaymentInput = {
  paymentId: string;
  providerReference: string;
  amount: string;
  currencyCode: string;
  idempotencyKey: string;
  reason?: string;
};

export type RefundPaymentResult = {
  providerCode: PaymentProviderCode;
  providerRefundReference: string;
  status: "pending" | "succeeded" | "failed";
};

/**
 * Provider-specific code implements this boundary.
 *
 * IRTH Order, Payment, Return and Refund domains must not call Stripe,
 * Paymob, FAB or any other gateway SDK/API directly. They call an adapter
 * implementation that satisfies this contract.
 *
 * Provider adapters verify provider-specific webhook authenticity before
 * returning a VerifiedProviderEvent. Browser redirects are never payment proof.
 */
export interface PaymentProviderAdapter {
  readonly code: PaymentProviderCode;

  createPaymentSession(
    input: CreatePaymentSessionInput
  ): Promise<CreatePaymentSessionResult>;

  verifyWebhook(
    input: VerifyProviderWebhookInput
  ): Promise<VerifiedProviderEvent>;

  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
