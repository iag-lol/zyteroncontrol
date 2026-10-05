// Contratos del Módulo 07 · Finanzas y Contabilidad.
// Montos en la moneda del documento; la contabilidad registra en moneda base (CLP). Fechas contables como "AAAA-MM-DD".
import type { Role } from "./index.js";

// Matriz RBAC financiera: espejo exacto de role_permissions de la migración (verificado por test). Fuente única para API y web.
export const financePermissions = ["finance.dashboard.view","invoice.view","invoice.create","invoice.edit","invoice.approve","invoice.issue","dte.view","dte.issue","dte.credit_note","dte.debit_note","dte.manage","receivable.view","collection.manage","payment.view","payment.record","payment.refund","payment.allocate","payable.view","payable.approve","payable.pay","expense.view","expense.create","expense.approve","bank.view","bank.import","bank.reconcile","accounting.view","journal.create","journal.review","journal.post","journal.reverse","period.view","period.close","period.reopen","tax.view","tax.review","tax.manage","report.finance.view","report.finance.export","commission.finance.manage","finance.settings.manage","quote_payment.view","quote_payment.manage","quote_payment.mark_paid"] as const;
export type FinancePermission = (typeof financePermissions)[number];
const accountantPermissions: FinancePermission[] = ["finance.dashboard.view","invoice.view","dte.view","dte.manage","receivable.view","payment.view","payable.view","expense.view","expense.approve","bank.view","bank.import","bank.reconcile","accounting.view","journal.create","journal.review","journal.post","journal.reverse","period.view","period.close","period.reopen","tax.view","tax.review","tax.manage","report.finance.view","report.finance.export","quote_payment.view"];
const salesLeadPermissions: FinancePermission[] = ["invoice.view","invoice.create","receivable.view","collection.manage","payment.view","quote_payment.view","quote_payment.manage","quote_payment.mark_paid"];
export const financeRoleMatrix: Partial<Record<Role, readonly FinancePermission[]>> = {
  GERENTE_GENERAL: financePermissions, FINANZAS: financePermissions, CONTADOR: accountantPermissions, JEFE_VENTAS: salesLeadPermissions, COMERCIAL: salesLeadPermissions,
  EJECUTIVA_VENTAS: ["invoice.view","receivable.view","collection.manage","quote_payment.view","quote_payment.manage"],
};
export const hasFinancePermission = (role: string, permission: FinancePermission) => Boolean(financeRoleMatrix[role as Role]?.includes(permission));

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type StatementSection = "CURRENT_ASSET" | "NON_CURRENT_ASSET" | "CURRENT_LIABILITY" | "NON_CURRENT_LIABILITY" | "EQUITY" | "OPERATING_REVENUE" | "OTHER_REVENUE" | "COST_OF_SALES" | "OPERATING_EXPENSE" | "FINANCIAL_EXPENSE" | "OTHER_EXPENSE";
export interface LedgerAccount { id: string; code: string; name: string; parentId: string | null; accountType: AccountType; normalBalance: NormalBalance; statementSection: StatementSection | null; allowsPosting: boolean; isCash: boolean; currency: string | null; active: boolean; createdAt: string; updatedAt: string; }
export interface CostCenter { id: string; code: string; name: string; description: string | null; active: boolean; }
export type PeriodStatus = "OPEN" | "CLOSING" | "CLOSED" | "LOCKED";
export interface AccountingPeriod { id: string; periodKey: string; year: number; month: number; startsOn: string; endsOn: string; status: PeriodStatus; closedAt: string | null; closedBy: string | null; lockedAt: string | null; reopenedAt: string | null; reopenReason: string | null; reopenCount: number; }

export type JournalStatus = "DRAFT" | "PENDING_REVIEW" | "POSTED" | "REVERSED";
export type JournalSource = "MANUAL" | "RULE" | "REVERSAL" | "OPENING" | "CLOSING" | "ADJUSTMENT" | "RECONCILIATION" | "COPILOT_PROPOSAL";
export interface JournalLine { id: string; journalEntryId: string; lineNumber: number; accountId: string; accountCode?: string | null; accountName?: string | null; debit: number; credit: number; currency: string; originalAmount: number | null; exchangeRate: number; costCenterId: string | null; clientId: string | null; projectId: string | null; serviceId: string | null; departmentCode: string | null; description: string | null; }
export interface JournalEntry {
  id: string; entryNumber: string | null; entryDate: string; description: string; sourceType: JournalSource; sourceId: string | null; sourceEventId: string | null; ruleVersionId: string | null;
  status: JournalStatus; periodId: string; currency: string; totalDebit: number; totalCredit: number; createdBy: string | null; submittedBy: string | null; reviewedBy: string | null;
  postedBy: string | null; postedAt: string | null; reversalOfId: string | null; reversedById: string | null; reversalReason: string | null; createdAt: string; updatedAt: string; lines?: JournalLine[];
}
export type AmountKey = "TOTAL" | "NET" | "EXEMPT" | "TAX" | "GROSS" | "FEE" | "NET_SETTLEMENT" | "AMOUNT" | "TAX_ELIGIBLE" | "TAX_NON_ELIGIBLE";
export interface RuleLineTemplate { side: "DEBIT" | "CREDIT"; account: { code?: string; context?: string; fallbackCode?: string }; amount: AmountKey[]; dimensions: Array<"client" | "project" | "service" | "costCenter">; description: string; }
export interface AccountingRuleVersion { id: string; ruleId: string; version: number; status: "DRAFT" | "ACTIVE" | "RETIRED"; lines: RuleLineTemplate[]; effectiveFrom: string | null; notes: string | null; activatedBy: string | null; activatedAt: string | null; createdAt: string; }
export interface AccountingRule { id: string; code: string; name: string; eventType: string; description: string | null; filters: Record<string, string>; autoPost: boolean; active: boolean; versions?: AccountingRuleVersion[]; }
export interface AccountingEvent { id: string; eventType: string; sourceType: string; sourceId: string; idempotencyKey: string; amounts: Partial<Record<AmountKey, number>>; context: Record<string, unknown>; occurredOn: string; status: "PENDING" | "ENTRY_CREATED" | "UNMAPPED" | "ERROR" | "SKIPPED"; journalEntryId: string | null; ruleVersionId: string | null; message: string | null; createdAt: string; }

export interface TaxRuleVersion { id: string; taxRuleId: string; rate: number; effectiveFrom: string; effectiveTo: string | null; sourceReference: string; active: boolean; }
export interface TaxRule { id: string; code: string; taxType: string; name: string; description: string | null; active: boolean; versions: TaxRuleVersion[]; }
export interface TaxDocumentType { code: number; name: string; category: string; sign: number; enabledForIssue: boolean; certified: boolean; notes: string | null; }

export type InvoiceStatus = "DRAFT" | "PENDING_APPROVAL" | "READY_TO_ISSUE" | "ISSUING" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED" | "CREDITED" | "VOID";
export interface InvoiceLine { id: string; invoiceId: string; lineNumber: number; description: string; quantity: number; unitPrice: number; discountAmount: number; netAmount: number; isExempt: boolean; clientServiceId: string | null; catalogServiceId: string | null; projectId: string | null; costCenterId: string | null; revenueAccountId: string | null; }
export interface ClientBillingSnapshot { rut: string | null; legalName: string; businessActivity: string | null; address: string | null; commune: string | null; city: string | null; dteEmail: string | null; }
export interface Invoice {
  id: string; invoiceNumber: string; documentTypeCode: number; clientId: string; clientName?: string | null; saleId: string | null; contractId: string | null; projectId: string | null; clientServiceId: string | null;
  billingScheduleId: string | null; referenceInvoiceId: string | null; referenceCode: number | null; referenceReason: string | null; currency: string; exchangeRate: number;
  netAmount: number; exemptAmount: number; taxAmount: number; totalAmount: number; taxRate: number | null; taxRuleVersionId: string | null; amountPaid: number; amountCredited: number; balanceDue: number;
  status: InvoiceStatus; effectiveStatus: InvoiceStatus | "OVERDUE"; issueDate: string | null; dueDate: string | null; paymentTermsDays: number | null; paymentTerms: string | null; description: string | null; notes: string | null;
  clientSnapshot: Partial<ClientBillingSnapshot>; taxDocumentId: string | null; approvalRequired: boolean; approvedBy: string | null; approvedAt: string | null; issuedAt: string | null;
  cancelledAt: string | null; cancelReason: string | null; createdBy: string | null; createdAt: string; updatedAt: string; lines?: InvoiceLine[]; daysOverdue?: number;
}
export interface BillingSchedule { id: string; clientId: string; clientName?: string | null; clientServiceId: string | null; contractId: string | null; description: string; frequency: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL" | "CUSTOM_DAYS"; intervalDays: number | null; amount: number; currency: string; isExempt: boolean; nextBillingDate: string; endDate: string | null; active: boolean; paymentTermsDays: number | null; revenueAccountId: string | null; costCenterId: string | null; createdAt: string; }

export type TaxDocumentStatus = "DRAFT" | "VALIDATED" | "SIGNED" | "SUBMITTED" | "RECEIVED_BY_SII" | "ACCEPTED" | "ACCEPTED_WITH_REPAIRS" | "REJECTED" | "CANCELLED";
export interface TaxDocument { id: string; invoiceId: string; documentTypeCode: number; folio: number | null; provider: "SII_DIRECT" | "EXTERNAL"; environment: "CERTIFICATION" | "PRODUCTION"; status: TaxDocumentStatus; trackId: string | null; submissionId: string | null; submittedAt: string | null; statusCode: string | null; statusMessage: string | null; lastCheckedAt: string | null; acceptedAt: string | null; rejectedAt: string | null; xmlSignedSha256: string | null; pdfPath: string | null; emitterRut: string | null; receiverRut: string | null; issueDate: string | null; netAmount: number | null; exemptAmount: number | null; taxAmount: number | null; totalAmount: number | null; createdAt: string; }
export interface TaxDocumentEvent { id: string; taxDocumentId: string; status: string; code: string | null; message: string | null; detail: Record<string, unknown>; occurredAt: string; }
export interface DteRequirement {
  key: string;
  label: string;
  satisfied: boolean;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}
export interface DteReadiness { canIssue: boolean; provider: string; environment: string; requirements: DteRequirement[]; missing: string[]; }
export interface DteCertificate { id: string; label: string; subject: string; issuer: string; serialNumber: string; holderRut: string | null; validFrom: string; expiresAt: string; fingerprintSha256: string; secretRef: string; status: string; daysRemaining: number; }
export interface FolioAuthorization { id: string; documentTypeCode: number; environment: string; rangeFrom: number; rangeTo: number; authorizedAt: string; status: string; available: number; used: number; reserved: number; voided: number; }

export type TaxCreditClassification = "PENDING_REVIEW" | "DEL_GIRO" | "SUPERMERCADO" | "BIENES_RAICES" | "ACTIVO_FIJO" | "USO_COMUN" | "NO_RECUPERABLE" | "NO_CORRESPONDE";
export interface ReceivedTaxDocument { id: string; issuerRut: string; issuerName: string; issuerBusinessActivity: string | null; documentTypeCode: number; folio: number; issueDate: string; receivedAt: string; netAmount: number; exemptAmount: number; taxAmount: number; totalAmount: number; docReferences: Array<Record<string, unknown>>; source: string; signatureStatus: "NOT_VERIFIED" | "VALID" | "INVALID"; validationErrors: string[]; vendorId: string | null; status: string; taxCreditClassification: TaxCreditClassification; taxCreditEligible: boolean | null; taxCreditEligibleAmount: number | null; classificationReason: string | null; reviewedBy: string | null; reviewedAt: string | null; expenseId: string | null; createdAt: string; }
export type RcvMatchStatus = "MATCHED" | "MISSING_LOCAL" | "MISSING_SII" | "AMOUNT_MISMATCH" | "STATUS_MISMATCH" | "REVIEW_REQUIRED";
export interface RcvComparisonRow { key: string; registerType: "COMPRAS" | "VENTAS"; counterpartRut: string; counterpartName: string | null; documentTypeCode: number; folio: number; issueDate: string | null; siiTotal: number | null; localTotal: number | null; siiTax: number | null; localTax: number | null; status: RcvMatchStatus; detail: string; localId: string | null; rcvEntryId: string | null; }

export interface Vendor { id: string; rut: string; legalName: string; tradeName: string | null; businessActivity: string | null; contactName: string | null; email: string | null; phone: string | null; address: string | null; paymentTermsDays: number; bankName: string | null; bankAccountType: string | null; bankAccountLast4: string | null; hasEncryptedBankAccount: boolean; bankHolderRut: string | null; status: "ACTIVE" | "INACTIVE" | "BLOCKED"; defaultExpenseCategoryId: string | null; createdAt: string; }
export interface ExpenseCategory { id: string; code: string; name: string; expenseAccountId: string; defaultCostCenterId: string | null; active: boolean; }
export type ExpenseStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface Expense { id: string; expenseNumber: string; vendorId: string | null; vendorName?: string | null; receivedTaxDocumentId: string | null; expenseDate: string; documentTypeCode: number | null; documentNumber: string | null; categoryId: string; description: string; netAmount: number; exemptAmount: number; taxAmount: number; totalAmount: number; currency: string; taxCreditClassification: TaxCreditClassification; taxCreditEligible: boolean | null; eligibleTaxAmount: number; classificationReason: string | null; costCenterId: string | null; projectId: string | null; clientId: string | null; departmentCode: string | null; responsibleUserId: string | null; paymentMethod: string | null; evidencePath: string | null; status: ExpenseStatus; approvedBy: string | null; approvedAt: string | null; payableId: string | null; createdBy: string | null; createdAt: string; }
export interface ApprovalPolicy { id: string; entityType: string; name: string; minAmount: number; maxAmount: number | null; categoryId: string | null; costCenterId: string | null; departmentCode: string | null; approverRole: string; approverUserId: string | null; level: number; active: boolean; }
export interface ApprovalRequest { id: string; entityType: string; entityId: string; policyId: string | null; level: number; requiredRole: string; requiredUserId: string | null; status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"; requestedBy: string | null; decidedBy: string | null; decidedAt: string | null; comment: string | null; createdAt: string; }
export type PayableStatus = "PENDING_REVIEW" | "APPROVED" | "SCHEDULED" | "PARTIALLY_PAID" | "PAID" | "DISPUTED" | "CANCELLED";
export interface Payable { id: string; vendorId: string; vendorName?: string | null; sourceType: "EXPENSE" | "RECEIVED_DTE" | "MANUAL"; sourceId: string | null; documentNumber: string | null; description: string; amount: number; amountPaid: number; balance: number; currency: string; issueDate: string | null; dueDate: string; status: PayableStatus; effectiveStatus: PayableStatus | "OVERDUE"; scheduledFor: string | null; disputeReason: string | null; approvedBy: string | null; createdBy: string | null; createdAt: string; }
export interface VendorPayment { id: string; paymentNumber: string; vendorId: string; vendorName?: string | null; amount: number; currency: string; paymentDate: string | null; method: string; reference: string | null; evidencePath: string | null; bankAccountId: string | null; bankTransactionId: string | null; status: "REQUESTED" | "APPROVED" | "EXECUTED" | "RECONCILED" | "CANCELLED"; requestedBy: string | null; approvedBy: string | null; executedBy: string | null; executedAt: string | null; createdAt: string; allocations?: Array<{ payableId: string; amount: number }>; }

export type PaymentStatus = "PENDING" | "PENDING_VERIFICATION" | "CONFIRMED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "DISPUTED" | "CHARGEBACK";
export interface Payment { id: string; paymentReference: string; clientId: string; clientName?: string | null; provider: "BANK_TRANSFER" | "MERCADOPAGO" | "CASH" | "OTHER"; method: string; currency: string; grossAmount: number; feeAmount: number; netAmount: number; receivedAt: string; status: PaymentStatus; externalId: string | null; externalStatus: string | null; allocatedAmount: number; refundedAmount: number; unappliedAmount: number; bankAccountId: string | null; bankTransactionId: string | null; cashMovementId: string | null; evidencePath: string | null; notes: string | null; recordedBy: string | null; confirmedBy: string | null; confirmedAt: string | null; settlementStatus: string; moneyReleaseDate: string | null; createdAt: string; }
export interface PaymentAllocation { id: string; paymentId: string; invoiceId: string; amount: number; allocatedBy: string | null; allocatedAt: string; reversedAt: string | null; reversalReason: string | null; }
export interface PaymentRefund { id: string; paymentId: string; amount: number; reason: string; status: "REQUESTED" | "PROCESSING" | "REFUNDED" | "FAILED"; providerRefundId: string | null; failureReason: string | null; createdAt: string; }
export interface PaymentPromise { id: string; clientId: string; clientName?: string | null; invoiceId: string | null; amount: number; promisedDate: string; responsibleUserId: string | null; status: "OPEN" | "KEPT" | "BROKEN" | "RESCHEDULED"; notes: string | null; createdAt: string; resolvedAt: string | null; }
export interface CollectionActivity { id: string; clientId: string; invoiceId: string | null; activityType: "EMAIL" | "CALL" | "WHATSAPP" | "MEETING" | "NOTE" | "REMINDER" | "PROMISE"; outcome: string | null; notes: string | null; performedBy: string | null; occurredAt: string; }
export interface OnlinePaymentConfig { enabled: boolean; provider: "MERCADOPAGO" | null; publicKey: string | null; missing: string[]; redirectNotice: string; }

export interface BankAccount { id: string; bankName: string; accountType: string; accountNumberLast4: string; holderName: string | null; currency: string; ledgerAccountId: string; openingBalance: number; openingBalanceDate: string | null; active: boolean; }
export interface CashAccount { id: string; name: string; custodianUserId: string | null; currency: string; ledgerAccountId: string; active: boolean; }
export interface BankTransaction { id: string; bankAccountId: string; importId: string | null; transactionDate: string; description: string; amount: number; direction: "CREDIT" | "DEBIT"; reference: string | null; balance: number | null; externalHash: string; reconciliationStatus: "UNRECONCILED" | "PARTIALLY_RECONCILED" | "RECONCILED" | "IGNORED"; reconciledAmount: number; ignoredReason: string | null; createdAt: string; }
export interface StatementPreviewRow { rowNumber: number; date: string | null; description: string; amount: number | null; direction: "CREDIT" | "DEBIT" | null; reference: string | null; balance: number | null; hash: string | null; errors: string[]; duplicate: boolean; }
export interface StatementPreview { fileName: string; fileSha256: string; format: "CSV" | "XLSX"; headers: string[]; mapping: Record<string, string | null>; rows: StatementPreviewRow[]; valid: number; invalid: number; duplicates: number; alreadyImported: boolean; }
export interface ReconciliationCandidate { targetType: string; targetId: string; label: string; amount: number; date: string | null; confidence: number; reasons: string[]; }
export interface ReconciliationSuggestion { bankTransaction: BankTransaction; candidates: ReconciliationCandidate[]; ambiguous: boolean; }
export interface ReconciliationMatch { id: string; bankTransactionId: string; targetType: string; targetId: string; amount: number; matchGroup: string; matchKind: "MATCH" | "SPLIT" | "MERGE" | "CREATED"; confidence: number | null; status: "ACTIVE" | "UNDONE"; createdBy: string | null; createdAt: string; undoReason: string | null; }

export interface Budget { id: string; name: string; fiscalYear: number; scopeType: string; costCenterId: string | null; projectId: string | null; departmentCode: string | null; status: "DRAFT" | "APPROVED" | "ARCHIVED"; approvedBy: string | null; createdAt: string; lines?: BudgetLine[]; }
export interface BudgetLine { id: string; budgetId: string; accountId: string; periodKey: string; amount: number; costCenterId: string | null; projectId: string | null; notes: string | null; }
export interface BudgetVsActualRow { accountId: string; accountCode: string; accountName: string; periodKey: string | null; budget: number; actual: number; variance: number; variancePercent: number | null; }

export interface CommissionFinanceView { commissionId: string; saleId: string; userId: string; amount: number; currency: string; commercialStatus: string; financeStatus: "NOT_ELIGIBLE" | "ELIGIBLE" | "PAYABLE" | "PAID" | "CANCELLED"; collectedPercent: number | null; invoicedAmount: number; collectedAmount: number; reason: string; payment: { id: string; status: string; paidAt: string | null; paymentReference: string | null } | null; }

export interface CloseTask { id: string; checklistItemId: string; code: string; label: string; checkType: "AUTO" | "MANUAL"; blocking: boolean; status: "PENDING" | "OK" | "BLOCKED" | "WAIVED" | "NOT_APPLICABLE"; result: Record<string, unknown>; responsibleUserId: string | null; evidencePath: string | null; notes: string | null; checkedAt: string | null; }
export interface CloseRun { id: string; periodId: string; period: AccountingPeriod; status: "IN_PROGRESS" | "BLOCKED" | "READY" | "CLOSED"; tasks: CloseTask[]; blockers: string[]; snapshots: Array<{ id: string; version: number; sha256: string; createdAt: string }>; }

export interface TaxObligation { id: string; code: string; name: string; taxType: string; periodKey: string; dueDate: string; status: string; responsibleUserId: string | null; sourceReference: string; filedReference: string | null; filedEvidencePath: string | null; filedAt: string | null; notes: string | null; daysToDue: number; }
export interface F29Line { key: string; label: string; amount: number; source: string; drillDown: string; officialCode: string | null; }
export interface F29Preparation { id: string; periodKey: string; status: "PREPARATION" | "REVIEW_REQUIRED" | "REVIEWED" | "READY" | "FILED_EXTERNALLY" | "SUBMITTED" | "ACCEPTED"; lines: F29Line[]; totals: Record<string, number>; ppmRate: number | null; notes: string | null; preparedAt: string | null; reviewedBy: string | null; reviewedAt: string | null; filedReference: string | null; filedAt: string | null; disclaimer: string; }
export interface VatSummary { periodKey: string; debit: number; creditNotesDebit: number; debitNotesDebit: number; netDebit: number; creditPotential: number; creditEligible: number; creditPendingReview: number; creditNonRecoverable: number; adjustments: number; estimatedPayable: number; remainder: number; label: "Estimación interna"; sources: Array<{ label: string; count: number; amount: number; href: string }>; }

export interface TrialBalanceRow { accountId: string; code: string; name: string; accountType: AccountType; opening: number; debit: number; credit: number; closing: number; }
export interface TrialBalance { from: string; to: string; rows: TrialBalanceRow[]; totals: { opening: number; debit: number; credit: number; closing: number }; balanced: boolean; }
export interface StatementLine { accountId: string | null; code: string | null; name: string; amount: number; level: number; }
export interface IncomeStatement { from: string; to: string; sections: Array<{ key: string; label: string; lines: StatementLine[]; total: number }>; revenue: number; costOfSales: number; grossProfit: number; operatingExpenses: number; operatingResult: number; otherNet: number; netResult: number; }
export interface BalanceSheet { asOf: string; assets: StatementLine[]; liabilities: StatementLine[]; equity: StatementLine[]; totalAssets: number; totalLiabilities: number; totalEquity: number; currentResult: number; balanced: boolean; difference: number; }
export interface LedgerMovement { entryId: string; entryNumber: string | null; entryDate: string; description: string; sourceType: string; sourceId: string | null; lineDescription: string | null; debit: number; credit: number; balance: number; clientId: string | null; projectId: string | null; costCenterId: string | null; drillDown: string | null; }
export interface AgingBucket { key: "CURRENT" | "D1_30" | "D31_60" | "D61_90" | "D90_PLUS"; label: string; amount: number; count: number; }
export interface AgingReport { asOf: string; total: number; buckets: AgingBucket[]; byParty: Array<{ partyId: string; partyName: string; total: number; buckets: Record<string, number>; oldestDays: number }>; }
export interface CashflowPoint { periodKey: string; inflows: number; outflows: number; net: number; kind: "REAL" | "PROJECTION"; }
export interface CashflowReport { cashPosition: number; cashAccounts: Array<{ id: string; name: string; balance: number; kind: "BANK" | "CASH" | "LEDGER" }>; history: CashflowPoint[]; projection: CashflowPoint[]; scenario: string; assumptions: string[]; }
export interface ProfitabilityRow { dimension: "CLIENT" | "PROJECT" | "SERVICE"; id: string; name: string; revenue: number; directCosts: number; laborCost: number | null; laborHours: number; expenses: number; grossMargin: number; grossMarginPercent: number | null; operatingMargin: number | null; notes: string[]; }
export interface FinanceMetric { key: string; label: string; value: number | null; unit: "CLP" | "PERCENT" | "DAYS" | "COUNT"; definition: string; insufficientData: boolean; drillDown: string | null; }

export interface Anomaly { key: string; severity: "INFO" | "ATTENTION" | "RISK" | "CRITICAL"; title: string; detail: string; count: number; amount: number | null; drillDown: string; }
export interface AccountingHealth { status: "GREEN" | "ATTENTION" | "RISK" | "CRITICAL"; score: number; factors: Anomaly[]; explanation: string; generatedAt: string; }
export interface FinanceKpi { key: string; label: string; value: number; currency: string | null; definition: string; href: string; tone: "NEUTRAL" | "GOOD" | "WARNING" | "CRITICAL"; }
export interface FinanceDashboard { period: { from: string; to: string; periodKey: string }; kpis: FinanceKpi[]; health: AccountingHealth; cash: { position: number; accounts: CashflowReport["cashAccounts"] }; aging: AgingReport; apAging: AgingReport; dueSoon: Invoice[]; payablesDue: Payable[]; pendingToInvoice: Array<{ saleId: string; clientId: string | null; clientName: string | null; amount: number; invoiced: number; pending: number; currency: string; closedAt: string }>; revenueTrend: CashflowPoint[]; actions: Anomaly[]; dteReadiness: DteReadiness; generatedAt: string; }
export interface CopilotSource { label: string; query: string; href: string; }
export interface CopilotAnswer { id: string; question: string; intent: string; answer: string; period: { from: string; to: string } | null; amounts: Array<{ label: string; value: number; currency: string | null }>; rows: Array<Record<string, unknown>>; sources: CopilotSource[]; drillDown: string | null; lastUpdated: string; proposal: { kind: "JOURNAL_ENTRY"; description: string; lines: Array<{ accountCode: string; debit: number; credit: number }> } | null; disclaimer: string; }
export interface FinanceNotification { id: string; eventKey: string; userId: string | null; audienceRole: string | null; type: string; title: string; body: string | null; entityType: string; entityId: string; href: string | null; severity: "INFO" | "WARNING" | "CRITICAL"; readAt: string | null; createdAt: string; }
export interface FinanceEvent { id: string; aggregateType: string; aggregateId: string; eventType: string; actorId: string | null; clientId: string | null; projectId: string | null; title: string; payload: Record<string, unknown>; occurredAt: string; }
export interface FinanceScope { role: string; permissions: string[]; clientScope: "ALL" | "OWN" | "NONE"; }
export interface FinancePaged<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }
export interface ClientFinanceSummary { clientId: string; invoiced: number; paid: number; balance: number; overdue: number; creditBalance: number; nextBilling: { date: string; amount: number; description: string } | null; recurring: BillingSchedule[]; invoices: Invoice[]; payments: Payment[]; promises: PaymentPromise[]; currency: string; }
export interface ProjectFinanceSummary { projectId: string; soldValue: number | null; invoiced: number; collected: number; directCosts: number; laborHours: number; laborCost: number | null; expenses: number; margin: number | null; marginPercent: number | null; notes: string[]; currency: string; }

// Calendario de pagos de cotizaciones: pago único o mensual. La opción de pago se habilita N días antes del vencimiento
// y queda activa hasta marcarse pagada; marcar pagada exige la factura SII (PDF/XML) en el bucket privado quote-invoices.
export type QuotePaymentFrequency = "ONE_TIME" | "MONTHLY";
export type QuotePaymentPlanStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type QuoteInstallmentStatus = "SCHEDULED" | "PAID" | "CANCELLED";
export type QuoteInstallmentEffectiveStatus = "UPCOMING" | "PAYMENT_OPEN" | "OVERDUE" | "PAID" | "CANCELLED";
export type QuotePaymentMethod = "TRANSFER" | "CARD" | "CASH" | "CHECK" | "OTHER";
export const quoteInvoiceDocumentTypes = [33, 34, 39, 41, 56] as const;
export interface QuotePaymentPlan { id: string; quoteId: string; clientId: string | null; frequency: QuotePaymentFrequency; amount: number; currency: "CLP" | "UF" | "USD"; startDate: string; paymentDay: number; activationDaysBefore: number; totalInstallments: number | null; status: QuotePaymentPlanStatus; notes: string | null; cancelReason: string | null; createdBy: string | null; updatedBy: string | null; createdAt: string; updatedAt: string; }
export interface QuotePaymentInstallment {
  id: string; planId: string; quoteId: string; clientId: string | null; sequence: number; periodKey: string; dueDate: string; amount: number; currency: string; status: QuoteInstallmentStatus;
  effectiveStatus: QuoteInstallmentEffectiveStatus; paymentOpensOn: string; canMarkPaid: boolean; paidAt: string | null; paidAmount: number | null; paymentMethod: QuotePaymentMethod | null; paymentReference: string | null;
  siiDocumentType: number | null; siiFolio: number | null; siiIssueDate: string | null; hasInvoice: boolean; invoiceFileName: string | null; invoiceMime: string | null; clientVisible: boolean;
  markedPaidBy: string | null; markedPaidAt: string | null; notes: string | null; cancelReason: string | null;
  quoteNumber?: string | null; companyName?: string | null; clientName?: string | null; ownerId?: string | null;
}
export interface QuotePaymentQuote { id: string; quoteNumber: string; companyName: string; clientId: string | null; clientName: string | null; ownerId: string | null; status: string; currency: string; totalAmount: number; acceptedAt: string | null; }
export interface QuotePaymentSummary { total: number; paid: number; open: number; overdue: number; upcoming: number; cancelled: number; paidAmount: number; pendingAmount: number; nextDue: { id: string; dueDate: string; amount: number; effectiveStatus: QuoteInstallmentEffectiveStatus } | null; }
export interface QuotePaymentDetail { quote: QuotePaymentQuote; plan: QuotePaymentPlan | null; installments: QuotePaymentInstallment[]; summary: QuotePaymentSummary; eligible: boolean; eligibilityReason: string | null; permissions: { manage: boolean; markPaid: boolean }; }
export interface QuotePaymentBoard { items: QuotePaymentInstallment[]; kpis: { open: number; overdue: number; upcoming30: number; paidThisMonth: number; byCurrency: Record<string, { open: number; overdue: number; paidThisMonth: number }> }; asOf: string; }
/** Vista del portal cliente: sin datos internos; la factura sólo existe cuando la cuota está pagada y marcada visible. */
export interface PortalQuotePayment { id: string; quoteId: string; quoteNumber: string; sequence: number; periodKey: string; dueDate: string; amount: number; currency: string; status: Exclude<QuoteInstallmentEffectiveStatus, "CANCELLED">; paidAt: string | null; siiDocumentType: number | null; siiFolio: number | null; invoiceAvailable: boolean; }
