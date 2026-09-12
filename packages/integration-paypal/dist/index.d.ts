import { Cart, Transaction } from '@tillkit/core';

interface PayPalConfig {
    provider: 'paypal';
    clientId: string;
    clientSecret: string;
    webhookId?: string;
    sandbox?: boolean;
}
interface PayPalOrder {
    id: string;
    status: string;
    approvalUrl?: string;
    amount: number;
    currency: string;
}
interface PayPalCapture {
    id: string;
    status: string;
    amount: number;
    currency: string;
    payerEmail?: string;
    payerId?: string;
    payerName?: string;
}
/** Thrown when a webhook arrives but no webhookId is configured. Fail closed. */
declare class PayPalWebhookNotConfiguredError extends Error {
    constructor();
}
/** Thrown when a webhook fails provenance verification. */
declare class PayPalWebhookVerificationError extends Error {
    constructor(reason: string);
}
type PayPalHeaders = Headers | Record<string, string | string[] | undefined>;
declare function paypalIntegration(config: PayPalConfig): {
    createCheckoutSession(cart: Cart, options?: {
        customerEmail?: string;
        metadata?: Record<string, string>;
        returnUrl: string;
        cancelUrl: string;
    }): Promise<PayPalOrder>;
    capturePayment(orderId: string): Promise<PayPalCapture>;
    getOrder(orderId: string): Promise<PayPalOrder>;
    /**
     * Verify a webhook's provenance with PayPal, then return the parsed event.
     *
     * Async because verification is a network call. Throws rather than
     * returning a falsy value so an unverified event can never be processed by
     * accident.
     */
    handleWebhook(rawBody: string, headers: PayPalHeaders): Promise<any>;
    processWebhookEvent(event: any): Promise<{
        type: "payment_success" | "payment_failure" | "refund" | "dispute" | "other";
        data: unknown;
    }>;
    refund(captureId: string, amount?: number): Promise<any>;
    createTransactionFromCapture(capture: PayPalCapture): Omit<Transaction, "id">;
};
type PayPalIntegration = ReturnType<typeof paypalIntegration>;

export { type PayPalCapture, type PayPalConfig, type PayPalHeaders, type PayPalIntegration, type PayPalOrder, PayPalWebhookNotConfiguredError, PayPalWebhookVerificationError, paypalIntegration };
