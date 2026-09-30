export interface TaxDocumentProvider {
  createTaxDocument(input: { clientId: string; financeDocumentId: string }): Promise<{ providerReference: string; status: string }>;
  getTaxDocument(providerReference: string): Promise<{ status: string; documentUrl?: string }>;
}

export interface PaymentProvider {
  createCustomer(input: { clientId: string; legalName: string; email: string }): Promise<{ customerReference: string }>;
  createCheckout(input: { clientId: string; invoiceId: string; amount: number; currency: string }): Promise<{ checkoutReference: string; redirectUrl?: string }>;
}

export interface ElectronicSignatureProvider {
  createSignatureRequest(input: { documentId: string; signerContactIds: string[] }): Promise<{ signatureRequestId: string; status: string }>;
  getSignatureStatus(signatureRequestId: string): Promise<{ status: string; signedAt?: string }>;
}

export const clientProviderPorts = {
  taxDocuments: "NOT_CONFIGURED",
  payments: "NOT_CONFIGURED",
  electronicSignature: "NOT_CONFIGURED",
} as const;
