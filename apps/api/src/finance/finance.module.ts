import { Module } from "@nestjs/common";
import { ClientServicesModule } from "../client-services/client-services.module.js";
import { ClientsModule } from "../clients/clients.module.js";
import { CommercialModule } from "../commercial/commercial.module.js";
import { ContractsModule } from "../contracts/contracts.module.js";
import { OperationsModule } from "../operations/operations.module.js";
import { BankService, ReconciliationService, StatementImportService } from "./finance.banking.js";
import { BillingScheduleService, InvoiceService } from "./finance.billing.js";
import { BudgetService, CloseService, CommissionFinanceService, TaxService } from "./finance.close.js";
import { FinanceController, PaymentWebhookController, PublicPaymentController } from "./finance.controller.js";
import { FinanceContext } from "./finance.core.js";
import { DteCertificateProvider, DteSchemaValidator, ExternalCertifiedDteProvider, SiiDirectDteProvider } from "./finance.dte-providers.js";
import { DteService, RcvService, ReceivedDocumentsService } from "./finance.dte.js";
import { AccountingRuleEngine, LedgerService, StatementsService } from "./finance.ledger.js";
import { ApprovalService, ExpenseService, PayableService, VendorService } from "./finance.payables.js";
import { CollectionsService, MercadoPagoPaymentProvider, OnlinePaymentService, PaymentProvider, PaymentService } from "./finance.payments.js";
import { FinanceRepository } from "./finance.repository.js";
import { AnalyticsService, CopilotService, FinanceScheduler, ReportsService } from "./finance.reports.js";
import { FinanceSettingsService } from "./finance.settings.js";
import { FinanceSources } from "./finance.sources.js";

/** Módulo 07 · Financial & Accounting Control Center. Consume Clientes, Servicios, Contratos, Ventas y Operaciones sin duplicarlos. */
@Module({
  imports:[ClientsModule,ClientServicesModule,ContractsModule,CommercialModule,OperationsModule],
  controllers:[FinanceController,PaymentWebhookController,PublicPaymentController],
  providers:[FinanceRepository,FinanceSources,FinanceContext,FinanceSettingsService,LedgerService,AccountingRuleEngine,StatementsService,InvoiceService,BillingScheduleService,DteCertificateProvider,DteSchemaValidator,SiiDirectDteProvider,ExternalCertifiedDteProvider,DteService,ReceivedDocumentsService,RcvService,MercadoPagoPaymentProvider,{provide:PaymentProvider,useExisting:MercadoPagoPaymentProvider},PaymentService,OnlinePaymentService,CollectionsService,VendorService,ApprovalService,ExpenseService,PayableService,BankService,StatementImportService,ReconciliationService,CloseService,BudgetService,TaxService,CommissionFinanceService,AnalyticsService,ReportsService,CopilotService,FinanceScheduler],
  exports:[AnalyticsService],
})
export class FinanceModule {}
