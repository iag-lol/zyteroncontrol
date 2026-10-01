import { BadRequestException, Body, ForbiddenException, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Put, Query, Res, StreamableFile } from "@nestjs/common";
import { Public, RequireRoles } from "../auth/roles.decorator.js";
import { financePermissions, rolesFor } from "./finance.access.js";
import { BankService, ReconciliationService, StatementImportService } from "./finance.banking.js";
import { BillingScheduleService, InvoiceService } from "./finance.billing.js";
import { BudgetService, CloseService, CommissionFinanceService, TaxService } from "./finance.close.js";
import { DteService, RcvService, ReceivedDocumentsService } from "./finance.dte.js";
import { AccountingRuleEngine, LedgerService, StatementsService } from "./finance.ledger.js";
import { ApprovalService, ExpenseService, PayableService, VendorService } from "./finance.payables.js";
import { CollectionsService, OnlinePaymentService, PaymentService } from "./finance.payments.js";
import type { PageQuery } from "./finance.repository.js";
import { AnalyticsService, CopilotService, FinanceScheduler, ReportsService, reportTypes, type ReportType } from "./finance.reports.js";
import { FinanceSettingsService } from "./finance.settings.js";
import { type FinanceActor, isoDate, monthRange, todayCl } from "./finance.util.js";

type H=Record<string,string|undefined>;type Q=Record<string,string|undefined>;
const actor=(h:H):FinanceActor=>({userId:h["x-zyteron-user-id"]||null,role:h["x-zyteron-role"]||""});
const page=(q:Q):PageQuery&Record<string,any>=>({...q,page:Math.max(1,Number(q.page)||1),pageSize:Math.min(100,Math.max(1,Number(q.pageSize)||25)),search:q.search?.trim()||undefined});
/** Capa 1 (deny by default): sólo roles con algún permiso financiero. Capa 2: cada servicio valida el permiso exacto y el alcance por cliente. */
const ALL=rolesFor(...financePermissions);
const MANAGE=rolesFor("finance.settings.manage");
const range=(q:Q)=>{const today=todayCl();const from=q.from?isoDate(q.from,"Desde"):q.period?monthRange(q.period).from:`${today.slice(0,7)}-01`;const to=q.to?isoDate(q.to,"Hasta"):q.period?monthRange(q.period).to:today;return{from,to};};
function file(res:{setHeader:(k:string,v:string)=>void},out:{bytes:Buffer;mime:string;fileName:string}){res.setHeader("Content-Type",out.mime);res.setHeader("Content-Disposition",`attachment; filename="${encodeURIComponent(out.fileName)}"`);res.setHeader("Cache-Control","no-store");return new StreamableFile(out.bytes);}

@Controller("finance")
@RequireRoles(...ALL)
export class FinanceController {
  constructor(private readonly settings:FinanceSettingsService,private readonly ledger:LedgerService,private readonly rules:AccountingRuleEngine,private readonly statements:StatementsService,private readonly invoices:InvoiceService,private readonly schedules:BillingScheduleService,private readonly dte:DteService,private readonly received:ReceivedDocumentsService,private readonly rcv:RcvService,private readonly payments:PaymentService,private readonly online:OnlinePaymentService,private readonly collections:CollectionsService,private readonly vendors:VendorService,private readonly approvals:ApprovalService,private readonly expenses:ExpenseService,private readonly payables:PayableService,private readonly banks:BankService,private readonly statementsImport:StatementImportService,private readonly reconciliation:ReconciliationService,private readonly close:CloseService,private readonly budgets:BudgetService,private readonly tax:TaxService,private readonly commissions:CommissionFinanceService,private readonly analytics:AnalyticsService,private readonly reports:ReportsService,private readonly copilot:CopilotService,private readonly scheduler:FinanceScheduler){}

  // ---------------------------------------------------------------- command center y configuración
  @Get() root(@Headers() h:H,@Query("period") period?:string){return this.analytics.dashboard(actor(h),period||undefined);}
  @Get("dashboard") dashboard(@Headers() h:H,@Query("period") period?:string){return this.analytics.dashboard(actor(h),period||undefined);}
  @Get("scope") scope(@Headers() h:H){return this.settings.scope(actor(h));}
  @Get("metrics") metrics(@Headers() h:H){this.analyticsGuard(h);return this.analytics.metrics();}
  @Get("health") health(@Headers() h:H){this.analyticsGuard(h);return this.analytics.health();}
  private analyticsGuard(h:H){const a=actor(h);if(!rolesFor("finance.dashboard.view").includes(a.role as never))throw new ForbiddenException("Sin acceso al tablero financiero.");}
  @Get("settings") getSettings(@Headers() h:H){return this.settings.get(actor(h));}
  @Patch("settings") @RequireRoles(...MANAGE) updateSettings(@Body() b:any,@Headers() h:H){return this.settings.update(b,actor(h));}
  @Get("catalogs") catalogs(@Headers() h:H){return this.settings.catalogs(actor(h));}
  @Get("client-options") clientOptions(@Headers() h:H,@Query("search") search?:string){return this.settings.clientOptions(actor(h),search);}
  @Get("project-options") projectOptions(@Headers() h:H){return this.settings.projectOptions(actor(h));}
  @Get("notifications") notifications(@Headers() h:H){return this.settings.notifications(actor(h));}
  @Post("notifications/:id/read") read(@Param("id") id:string,@Headers() h:H){return this.settings.markRead(id,actor(h));}
  @Get("activity") activity(@Headers() h:H,@Query("clientId") clientId?:string){return this.settings.activity(actor(h),clientId);}
  @Get("audit") audit(@Headers() h:H,@Query() q:Q){return this.settings.audit(actor(h),q);}
  @Get("cost-rates") costRates(@Headers() h:H){return this.settings.costRates(actor(h));}
  @Post("cost-rates") addCostRate(@Body() b:any,@Headers() h:H){return this.settings.addCostRate(b,actor(h));}
  @Get("scheduled-costs") scheduledCosts(@Headers() h:H){return this.settings.scheduledCosts(actor(h));}
  @Post("scheduled-costs") addScheduledCost(@Body() b:any,@Headers() h:H){return this.settings.saveScheduledCost(null,b,actor(h));}
  @Patch("scheduled-costs/:id") updateScheduledCost(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.settings.saveScheduledCost(id,b,actor(h));}
  @Patch("forecast-scenarios/:id") scenario(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.settings.updateScenario(id,b,actor(h));}
  @Post("scheduler/run-due") @RequireRoles("GERENTE_GENERAL","FINANZAS") runDue(@Headers() h:H){return this.scheduler.runDue(actor(h));}

  // ---------------------------------------------------------------- contabilidad
  @Get("accounts") accounts(@Headers() h:H,@Query("balances") balances?:string){this.ledgerGuard(h);return this.ledger.accounts(balances==="true");}
  private ledgerGuard(h:H){if(!rolesFor("accounting.view").includes(actor(h).role as never))throw new ForbiddenException("Tu rol no accede al libro contable.");}
  @Post("accounts") createAccount(@Body() b:any,@Headers() h:H){return this.ledger.createAccount(b,actor(h));}
  @Patch("accounts/:id") updateAccount(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.ledger.updateAccount(id,b,actor(h));}
  @Get("cost-centers") costCenters(){return this.ledger.costCenters();}
  @Post("cost-centers") createCostCenter(@Body() b:any,@Headers() h:H){return this.ledger.saveCostCenter(null,b,actor(h));}
  @Patch("cost-centers/:id") updateCostCenter(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.ledger.saveCostCenter(id,b,actor(h));}
  @Get("periods") periods(@Headers() h:H){this.ledgerGuard(h);return this.ledger.periods();}
  @Post("periods/:id/reopen") reopen(@Param("id") id:string,@Body("reason") reason:string,@Headers() h:H){return this.ledger.reopenPeriod(id,reason,actor(h));}
  @Post("periods/:id/lock") lock(@Param("id") id:string,@Headers() h:H){return this.ledger.lockPeriod(id,actor(h));}
  @Get("journal") journal(@Query() q:Q,@Headers() h:H){this.ledgerGuard(h);return this.ledger.entries(page(q));}
  @Post("journal") createEntry(@Body() b:any,@Headers() h:H){return this.ledger.createEntry(b,actor(h));}
  @Get("journal-book") journalBook(@Query() q:Q,@Headers() h:H){this.ledgerGuard(h);const r=range(q);return this.ledger.journalBook(r.from,r.to);}
  @Get("general-ledger") generalLedger(@Query() q:Q,@Headers() h:H){this.ledgerGuard(h);if(!q.accountId)throw new BadRequestException("Selecciona una cuenta.");const r=range(q);return this.ledger.ledger(q.accountId,r.from,r.to);}
  @Get("journal/:id") entry(@Param("id") id:string,@Headers() h:H){this.ledgerGuard(h);return this.ledger.entry(id);}
  @Patch("journal/:id") updateEntry(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.ledger.updateEntry(id,b,actor(h));}
  @Post("journal/:id/submit") submitEntry(@Param("id") id:string,@Headers() h:H){return this.ledger.submit(id,actor(h));}
  @Post("journal/:id/post") postEntry(@Param("id") id:string,@Headers() h:H){return this.ledger.post(id,actor(h));}
  @Post("journal/:id/reverse") reverseEntry(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.ledger.reverse(id,b,actor(h));}
  @Delete("journal/:id") discardEntry(@Param("id") id:string,@Headers() h:H){return this.ledger.discard(id,actor(h));}
  @Get("rules") listRules(@Headers() h:H){this.ledgerGuard(h);return this.rules.rules();}
  @Post("rules/:id/versions") ruleVersion(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.rules.createVersion(id,b,actor(h));}
  @Post("rules/:id/deactivate") deactivateRule(@Param("id") id:string,@Headers() h:H){return this.rules.deactivate(id,actor(h));}
  @Post("rule-versions/:id/activate") activateVersion(@Param("id") id:string,@Headers() h:H){return this.rules.activate(id,actor(h));}
  @Get("accounting-events") events(@Query() q:Q,@Headers() h:H){this.ledgerGuard(h);return this.rules.events(page(q));}
  @Post("accounting-events/reprocess") reprocess(@Headers() h:H){return this.rules.reprocessPending(actor(h));}
  @Get("statements/trial-balance") trial(@Query() q:Q,@Headers() h:H){this.ledgerGuard(h);const r=range(q);return this.statements.trialBalance(r.from,r.to);}
  @Get("statements/income-statement") income(@Query() q:Q,@Headers() h:H){this.ledgerGuard(h);const r=range(q);return this.statements.incomeStatement(r.from,r.to);}
  @Get("statements/balance-sheet") balance(@Query() q:Q,@Headers() h:H){this.ledgerGuard(h);return this.statements.balanceSheet(range(q).to);}

  // ---------------------------------------------------------------- facturación
  @Get("invoices") listInvoices(@Query() q:Q,@Headers() h:H){return this.invoices.list(page(q),actor(h));}
  @Post("invoices") createInvoice(@Body() b:any,@Headers() h:H){return this.invoices.createDraft(b,actor(h));}
  @Post("invoices/from-sale/:id") fromSale(@Param("id") id:string,@Headers() h:H){return this.invoices.fromSale(id,actor(h));}
  @Post("invoices/from-contract/:id") fromContract(@Param("id") id:string,@Headers() h:H){return this.invoices.fromContract(id,actor(h));}
  @Post("invoices/from-service/:id") fromService(@Param("id") id:string,@Headers() h:H){return this.invoices.fromClientService(id,actor(h));}
  @Get("pending-to-invoice") pending(@Headers() h:H){return this.invoices.pendingToInvoice(actor(h));}
  @Get("billable-changes") billableChanges(@Headers() h:H){return this.invoices.billableChangeRequests(actor(h));}
  @Get("invoices/:id") invoice(@Param("id") id:string,@Headers() h:H){return this.invoices.get(id,actor(h));}
  @Patch("invoices/:id") updateInvoice(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.invoices.updateDraft(id,b,actor(h));}
  @Post("invoices/:id/submit") submitInvoice(@Param("id") id:string,@Headers() h:H){return this.invoices.submit(id,actor(h));}
  @Post("invoices/:id/approve") approveInvoice(@Param("id") id:string,@Headers() h:H){return this.invoices.approve(id,actor(h));}
  @Post("invoices/:id/reject") rejectInvoice(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.invoices.reject(id,b,actor(h));}
  @Post("invoices/:id/cancel") cancelInvoice(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.invoices.cancel(id,b,actor(h));}
  @Post("invoices/:id/credit-note") creditNote(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.invoices.creditNote(id,b,actor(h));}
  @Post("invoices/:id/debit-note") debitNote(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.invoices.debitNote(id,b,actor(h));}
  @Get("invoices/:id/readiness") readiness(@Param("id") id:string,@Headers() h:H){return this.dte.readiness(id,actor(h));}
  @Post("invoices/:id/issue") issue(@Param("id") id:string,@Headers() h:H){return this.dte.issue(id,actor(h));}
  @Post("invoices/:id/register-external") registerExternal(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.dte.registerExternal(id,b,actor(h));}
  @Get("invoices/:id/payment-links") links(@Param("id") id:string,@Headers() h:H){return this.online.links(id,actor(h));}
  @Post("invoices/:id/payment-links") createLink(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.online.createLink(id,b,actor(h));}
  @Post("payment-links/:id/revoke") revokeLink(@Param("id") id:string,@Headers() h:H){return this.online.revokeLink(id,actor(h));}
  @Get("online-payments/config") onlineConfig(){return this.online.config();}
  @Get("billing-schedules") schedulesList(@Headers() h:H,@Query("clientId") clientId?:string){return this.schedules.list(actor(h),clientId);}
  @Get("billing-schedules/suggestions") scheduleSuggestions(@Headers() h:H){return this.schedules.suggestions(actor(h));}
  @Post("billing-schedules") createSchedule(@Body() b:any,@Headers() h:H){return this.schedules.create(b,actor(h));}
  @Post("billing-schedules/run-due") @RequireRoles("GERENTE_GENERAL","FINANZAS") runSchedules(@Headers() h:H,@Body("asOf") asOf?:string){return this.schedules.runDue(asOf?isoDate(asOf,"Fecha"):todayCl(),actor(h));}
  @Patch("billing-schedules/:id") updateSchedule(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.schedules.update(id,b,actor(h));}

  // ---------------------------------------------------------------- documentos tributarios
  @Get("dte/readiness") dteReadiness(@Headers() h:H){return this.dte.readiness(undefined,actor(h));}
  @Get("dte/certificates") certificates(@Headers() h:H){return this.dte.certificatesList(actor(h));}
  @Post("dte/certificates") registerCertificate(@Body() b:any,@Headers() h:H){return this.dte.registerCertificate(b,actor(h));}
  @Post("dte/certificates/:id/retire") retireCertificate(@Param("id") id:string,@Headers() h:H){return this.dte.retireCertificate(id,actor(h));}
  @Get("dte/folios") folios(@Headers() h:H){return this.dte.folioAuthorizations(actor(h));}
  @Post("dte/caf") caf(@Body() b:any,@Headers() h:H){return this.dte.uploadCaf(b,actor(h));}
  @Get("dte/document-types") documentTypes(){return this.dte.documentTypes();}
  @Patch("dte/document-types/:code") updateDocumentType(@Param("code") code:string,@Body() b:any,@Headers() h:H){return this.dte.updateDocumentType(Number(code),b,actor(h));}
  @Get("tax-documents") taxDocuments(@Query() q:Q,@Headers() h:H){return this.dte.documents(page(q),actor(h));}
  @Get("tax-documents/:id") taxDocument(@Param("id") id:string,@Headers() h:H){return this.dte.document(id,actor(h));}
  @Post("tax-documents/:id/refresh") refreshDte(@Param("id") id:string,@Headers() h:H){return this.dte.refreshStatus(id,actor(h));}
  @Post("tax-documents/:id/abandon") abandonDte(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.dte.abandon(id,b,actor(h));}
  @Post("tax-documents/:id/acceptance") acceptance(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.dte.registerAcceptance(id,b,actor(h));}
  @Get("tax-documents/:id/:kind") async downloadDte(@Param("id") id:string,@Param("kind") kind:string,@Headers() h:H,@Res({passthrough:true}) res:any){if(kind!=="xml"&&kind!=="pdf")throw new BadRequestException("Formato inválido.");return file(res,await this.dte.download(id,kind,actor(h)));}
  @Get("received-documents") receivedList(@Query() q:Q,@Headers() h:H){return this.received.list(page(q),actor(h));}
  @Post("received-documents/import") receivedImport(@Body() b:any,@Headers() h:H){return this.received.importXml(b,actor(h));}
  @Get("received-documents/:id") receivedOne(@Param("id") id:string,@Headers() h:H){return this.received.get(id,actor(h));}
  @Post("received-documents/:id/classify") classifyReceived(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.received.classify(id,b,actor(h));}
  @Post("received-documents/:id/status") receivedStatus(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.received.setStatus(id,b,actor(h));}
  @Post("received-documents/:id/vendor") receivedVendor(@Param("id") id:string,@Body("vendorId") vendorId:string,@Headers() h:H){return this.received.linkVendor(id,vendorId,actor(h));}
  @Post("received-documents/:id/expense") receivedExpense(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.expenses.fromReceivedDocument(id,b,actor(h));}
  @Get("rcv/imports") rcvImports(@Headers() h:H){return this.rcv.imports(actor(h));}
  @Post("rcv/import") rcvImport(@Body() b:any,@Headers() h:H){return this.rcv.importFile(b,actor(h));}
  @Get("rcv/compare") rcvCompare(@Query() q:Q,@Headers() h:H){return this.rcv.compare(q.registerType==="VENTAS"?"VENTAS":"COMPRAS",q.period??todayCl().slice(0,7),actor(h));}

  // ---------------------------------------------------------------- cobros y cobranza
  @Get("payments") paymentsList(@Query() q:Q,@Headers() h:H){return this.payments.list(page(q),actor(h));}
  @Post("payments") recordPayment(@Body() b:any,@Headers() h:H){return this.payments.record(b,actor(h),h["idempotency-key"]);}
  @Get("payments/:id") payment(@Param("id") id:string,@Headers() h:H){return this.payments.get(id,actor(h));}
  @Post("payments/:id/confirm") confirmPayment(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payments.confirm(id,b,actor(h));}
  @Post("payments/:id/reject") rejectPayment(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payments.reject(id,b,actor(h));}
  @Get("payments/:id/allocation-suggestion") suggestion(@Param("id") id:string,@Headers() h:H){return this.payments.suggestAllocation(id,actor(h));}
  @Post("payments/:id/allocate") allocate(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payments.allocate(id,b,actor(h));}
  @Post("payments/:id/refund") refund(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payments.refund(id,b,actor(h));}
  @Post("allocations/:id/reverse") reverseAllocation(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payments.reverseAllocation(id,b,actor(h));}
  @Post("refunds/:id/complete") completeRefund(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payments.completeRefund(id,b,actor(h));}
  @Get("credit-balances") creditBalances(@Headers() h:H){return this.payments.creditBalances(actor(h));}
  @Get("receivables/aging") arAging(@Headers() h:H,@Query("asOf") asOf?:string){return this.collections.aging(actor(h),asOf?isoDate(asOf,"Fecha"):todayCl());}
  @Get("receivables") receivables(@Headers() h:H,@Query("clientId") clientId?:string){return this.collections.openInvoices(actor(h),clientId||null);}
  @Get("collections") collectionsCenter(@Headers() h:H){return this.collections.center(actor(h));}
  @Get("collections/activities") activities(@Query("clientId") clientId:string,@Headers() h:H){return this.collections.activities(clientId,actor(h));}
  @Post("collections/activities") addActivity(@Body() b:any,@Headers() h:H){return this.collections.addActivity(b,actor(h));}
  @Get("collections/promises") promises(@Headers() h:H,@Query("status") status?:string){return this.collections.promises(actor(h),status);}
  @Post("collections/promises") createPromise(@Body() b:any,@Headers() h:H){return this.collections.createPromise(b,actor(h));}
  @Post("collections/promises/:id/resolve") resolvePromise(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.collections.resolvePromise(id,b,actor(h));}
  @Get("collections/reminder-rules") reminderRules(@Headers() h:H){return this.collections.reminderRules(actor(h));}
  @Patch("collections/reminder-rules/:id") updateReminder(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.collections.updateReminderRule(id,b,actor(h));}

  // ---------------------------------------------------------------- proveedores, gastos y cuentas por pagar
  @Get("vendors") vendorsList(@Query() q:Q,@Headers() h:H){return this.vendors.list(page(q),actor(h));}
  @Post("vendors") createVendor(@Body() b:any,@Headers() h:H){return this.vendors.create(b,actor(h));}
  @Get("vendors/:id") vendor(@Param("id") id:string,@Headers() h:H){return this.vendors.get(id,actor(h));}
  @Patch("vendors/:id") updateVendor(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.vendors.update(id,b,actor(h));}
  @Get("vendors/:id/bank-details") bankDetails(@Param("id") id:string,@Headers() h:H){return this.vendors.bankDetails(id,actor(h));}
  @Get("expense-categories") categories(){return this.vendors.categories();}
  @Post("expense-categories") createCategory(@Body() b:any,@Headers() h:H){return this.vendors.saveCategory(null,b,actor(h));}
  @Patch("expense-categories/:id") updateCategory(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.vendors.saveCategory(id,b,actor(h));}
  @Get("approval-policies") policies(@Headers() h:H){return this.approvals.policies(actor(h));}
  @Post("approval-policies") createPolicy(@Body() b:any,@Headers() h:H){return this.approvals.savePolicy(null,b,actor(h));}
  @Patch("approval-policies/:id") updatePolicy(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.approvals.savePolicy(id,b,actor(h));}
  @Get("approvals/inbox") inbox(@Headers() h:H){return this.approvals.inbox(actor(h));}
  @Get("expenses") expensesList(@Query() q:Q,@Headers() h:H){return this.expenses.list(page(q),actor(h));}
  @Post("expenses") createExpense(@Body() b:any,@Headers() h:H){return this.expenses.create(b,actor(h));}
  @Get("expenses/:id") expense(@Param("id") id:string,@Headers() h:H){return this.expenses.get(id,actor(h));}
  @Patch("expenses/:id") updateExpense(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.expenses.update(id,b,actor(h));}
  @Post("expenses/:id/classify") classifyExpense(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.expenses.classify(id,b,actor(h));}
  @Post("expenses/:id/submit") submitExpense(@Param("id") id:string,@Headers() h:H){return this.expenses.submit(id,actor(h));}
  @Post("expenses/:id/decide") decideExpense(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.expenses.decide(id,b,actor(h));}
  @Post("expenses/:id/cancel") cancelExpense(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.expenses.cancel(id,b,actor(h));}
  @Get("payables") payablesList(@Query() q:Q,@Headers() h:H){return this.payables.list(page(q),actor(h));}
  @Get("payables/aging") apAging(@Headers() h:H){return this.payables.aging(actor(h));}
  @Post("payables") createPayable(@Body() b:any,@Headers() h:H){return this.payables.createManual(b,actor(h));}
  @Post("payables/:id/:action") payableAction(@Param("id") id:string,@Param("action") action:string,@Body() b:any,@Headers() h:H){if(!["approve","schedule","dispute","resolve","cancel"].includes(action))throw new BadRequestException("Acción inválida.");return this.payables.transition(id,action as "approve",b,actor(h));}
  @Get("vendor-payments") vendorPayments(@Query() q:Q,@Headers() h:H){return this.payables.vendorPayments(page(q),actor(h));}
  @Post("vendor-payments") requestVendorPayment(@Body() b:any,@Headers() h:H){return this.payables.requestPayment(b,actor(h));}
  @Get("vendor-payments/:id") vendorPayment(@Param("id") id:string,@Headers() h:H){return this.payables.vendorPayment(id,actor(h));}
  @Post("vendor-payments/:id/approve") approveVendorPayment(@Param("id") id:string,@Headers() h:H){return this.payables.approvePayment(id,actor(h));}
  @Post("vendor-payments/:id/execute") executeVendorPayment(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payables.executePayment(id,b,actor(h));}
  @Post("vendor-payments/:id/cancel") cancelVendorPayment(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.payables.cancelPayment(id,b,actor(h));}

  // ---------------------------------------------------------------- bancos, cajas y conciliación
  @Get("bank-accounts") bankAccounts(@Headers() h:H){return this.banks.accounts(actor(h));}
  @Post("bank-accounts") createBankAccount(@Body() b:any,@Headers() h:H){return this.banks.saveAccount(null,b,actor(h));}
  @Patch("bank-accounts/:id") updateBankAccount(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.banks.saveAccount(id,b,actor(h));}
  @Get("cash-accounts") cashAccounts(@Headers() h:H){return this.banks.cashAccounts(actor(h));}
  @Post("cash-accounts") createCashAccount(@Body() b:any,@Headers() h:H){return this.banks.saveCashAccount(null,b,actor(h));}
  @Patch("cash-accounts/:id") updateCashAccount(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.banks.saveCashAccount(id,b,actor(h));}
  @Get("cash-movements") cashMovements(@Query("cashAccountId") id:string,@Headers() h:H){return this.banks.cashMovements(id,actor(h));}
  @Post("cash-movements") addCashMovement(@Body() b:any,@Headers() h:H){return this.banks.addCashMovement(b,actor(h));}
  @Post("cash-movements/:id/void") voidCash(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.banks.voidCashMovement(id,b,actor(h));}
  @Get("bank-statements") statementImports(@Headers() h:H,@Query("bankAccountId") id?:string){return this.statementsImport.imports(actor(h),id);}
  @Post("bank-statements/preview") @HttpCode(200) previewStatement(@Body() b:any,@Headers() h:H){return this.statementsImport.preview(b,actor(h));}
  @Post("bank-statements/import") importStatement(@Body() b:any,@Headers() h:H){return this.statementsImport.commit(b,actor(h));}
  @Get("reconciliation") workspace(@Headers() h:H,@Query("bankAccountId") id?:string){return this.reconciliation.workspace({bankAccountId:id},actor(h));}
  @Post("reconciliation/merge") merge(@Body() b:any,@Headers() h:H){return this.reconciliation.merge(b,actor(h));}
  @Post("reconciliation/auto") @RequireRoles("GERENTE_GENERAL","FINANZAS") autoMatch(@Headers() h:H){return this.reconciliation.autoMatch(actor(h));}
  @Post("reconciliation-matches/:id/undo") undo(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.reconciliation.undo(id,b,actor(h));}
  @Get("bank-transactions") bankTransactions(@Query() q:Q,@Headers() h:H){return this.reconciliation.transactions(q,actor(h));}
  @Get("bank-transactions/:id/suggestions") suggestions(@Param("id") id:string,@Headers() h:H){return this.reconciliation.suggestions(id,actor(h));}
  @Get("bank-transactions/:id/matches") matches(@Param("id") id:string,@Headers() h:H){return this.reconciliation.matches(id,actor(h));}
  @Post("bank-transactions/:id/match") match(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.reconciliation.match(id,b,actor(h));}
  @Post("bank-transactions/:id/ignore") ignore(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.reconciliation.ignore(id,b,actor(h));}
  @Post("bank-transactions/:id/unignore") unignore(@Param("id") id:string,@Headers() h:H){return this.reconciliation.unignore(id,actor(h));}
  @Post("bank-transactions/:id/create") createFromTx(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.reconciliation.createFromTransaction(id,b,actor(h));}

  // ---------------------------------------------------------------- cierre, presupuestos, impuestos y comisiones
  @Get("close-checklist") checklist(@Headers() h:H){return this.close.checklist(actor(h));}
  @Post("close-checklist") createChecklistItem(@Body() b:any,@Headers() h:H){return this.close.saveChecklistItem(null,b,actor(h));}
  @Patch("close-checklist/:id") updateChecklistItem(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.close.saveChecklistItem(id,b,actor(h));}
  @Patch("close-tasks/:id") updateCloseTask(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.close.updateTask(id,b,actor(h));}
  @Get("close/:period") closeCenter(@Param("period") period:string,@Headers() h:H){return this.close.center(period,actor(h));}
  @Post("close/:period/close") closePeriod(@Param("period") period:string,@Headers() h:H){return this.close.close(period,actor(h));}
  @Get("close/:period/snapshot") snapshot(@Param("period") period:string,@Query("version") version:string|undefined,@Headers() h:H){return this.close.snapshot(period,version?Number(version):undefined,actor(h));}
  @Get("budgets") budgetsList(@Headers() h:H){return this.budgets.list(actor(h));}
  @Post("budgets") createBudget(@Body() b:any,@Headers() h:H){return this.budgets.create(b,actor(h));}
  @Get("budgets/:id") budget(@Param("id") id:string,@Headers() h:H){return this.budgets.get(id,actor(h));}
  @Put("budgets/:id/lines") budgetLines(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.budgets.setLines(id,b,actor(h));}
  @Post("budgets/:id/approve") approveBudget(@Param("id") id:string,@Headers() h:H){return this.budgets.approve(id,actor(h));}
  @Post("budgets/:id/archive") archiveBudget(@Param("id") id:string,@Headers() h:H){return this.budgets.archive(id,actor(h));}
  @Get("budgets/:id/vs-actual") vsActual(@Param("id") id:string,@Headers() h:H){return this.budgets.vsActual(id,actor(h));}
  @Get("tax/rules") taxRules(@Headers() h:H){return this.tax.rules(actor(h));}
  @Post("tax/rules/:id/versions") taxVersion(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.tax.addVersion(id,b,actor(h));}
  @Post("tax/versions/:id/deactivate") taxDeactivate(@Param("id") id:string,@Headers() h:H){return this.tax.deactivateVersion(id,actor(h));}
  @Get("tax/vat") vat(@Query("period") period:string|undefined,@Headers() h:H){return this.tax.vatSummary(period||todayCl().slice(0,7),actor(h));}
  @Get("tax/f29/:period") f29(@Param("period") period:string,@Headers() h:H){return this.tax.f29(period,actor(h));}
  @Post("tax/f29/:period/prepare") prepareF29(@Param("period") period:string,@Headers() h:H){return this.tax.prepareF29(period,actor(h));}
  @Post("tax/f29/:period/:action") f29Action(@Param("period") period:string,@Param("action") action:string,@Body() b:any,@Headers() h:H){if(!["review","ready","file","accept"].includes(action))throw new BadRequestException("Acción inválida.");return this.tax.transitionF29(period,action as "review",b,actor(h));}
  @Get("tax/obligations") obligations(@Headers() h:H,@Query("period") period?:string){return this.tax.obligations(actor(h),period);}
  @Post("tax/obligations") createObligation(@Body() b:any,@Headers() h:H){return this.tax.createObligation(b,actor(h));}
  @Patch("tax/obligations/:id") updateObligation(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.tax.updateObligation(id,b,actor(h));}
  @Get("commissions") commissionsView(@Headers() h:H){return this.commissions.view(actor(h));}
  @Get("commissions/policies") commissionPolicies(@Headers() h:H){return this.commissions.policies(actor(h));}
  @Post("commissions/policies") createCommissionPolicy(@Body() b:any,@Headers() h:H){return this.commissions.savePolicy(null,b,actor(h));}
  @Patch("commissions/policies/:id") updateCommissionPolicy(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.commissions.savePolicy(id,b,actor(h));}
  @Post("commissions/:id/approve") approveCommission(@Param("id") id:string,@Headers() h:H){return this.commissions.approve(id,actor(h));}
  @Post("commissions/:id/pay") payCommission(@Param("id") id:string,@Body() b:any,@Headers() h:H){return this.commissions.pay(id,b,actor(h));}

  // ---------------------------------------------------------------- informes, analítica y copiloto
  @Get("cashflow") cashflow(@Headers() h:H,@Query("scenario") scenario?:string,@Query("months") months?:string){return this.analytics.cashflow(actor(h),scenario||"BASE",Number(months)||6);}
  @Get("profitability") profitability(@Query() q:Q,@Headers() h:H){const r=range(q);return this.analytics.profitability(actor(h),q.dimension==="PROJECT"?"PROJECT":"CLIENT",r.from,r.to);}
  @Get("clients/:id/summary") clientSummary(@Param("id") id:string,@Headers() h:H){return this.analytics.clientSummary(id,actor(h));}
  @Get("projects/:id/summary") projectSummary(@Param("id") id:string,@Headers() h:H){return this.analytics.projectSummary(id,actor(h));}
  @Get("reports/:type") report(@Param("type") type:string,@Query() q:Q,@Headers() h:H){if(!reportTypes.includes(type as ReportType))throw new BadRequestException("Informe inválido.");return this.reports.build(type as ReportType,q,actor(h));}
  @Get("reports/:type/export") async exportReport(@Param("type") type:string,@Query() q:Q,@Headers() h:H,@Res({passthrough:true}) res:any){if(!reportTypes.includes(type as ReportType))throw new BadRequestException("Informe inválido.");const format=q.format==="xlsx"||q.format==="pdf"?q.format:"csv";return file(res,await this.reports.export(type as ReportType,format,q,actor(h)));}
  @Post("copilot/ask") ask(@Body("question") question:string,@Headers() h:H){return this.copilot.ask(question,actor(h));}
  @Get("copilot/history") history(@Headers() h:H){return this.copilot.history(actor(h));}
  @Post("copilot/draft") draft(@Body() b:any,@Headers() h:H){return this.copilot.draftFromProposal(b,actor(h));}
  @Post("analysis/run") async analysis(@Headers() h:H){const a=actor(h);const health=await this.analytics.health();await this.copilot.ask("anomalías",a);return health;}
}

/** Webhook oficial de Mercado Pago: firma validada, idempotente; nunca confía en el navegador. */
@Controller("webhooks/payments")
export class PaymentWebhookController {
  constructor(private readonly online:OnlinePaymentService){}
  @Public() @Post("mercadopago") @HttpCode(200) mercadopago(@Query() q:Q,@Body() b:any,@Headers() h:H){return this.online.webhook(q,b,h);}
}
/** Portal de pago público por token aleatorio (hash en base), con vencimiento y alcance de una factura. */
@Controller("public/payments")
export class PublicPaymentController {
  constructor(private readonly online:OnlinePaymentService){}
  @Public() @Get(":token") view(@Param("token") token:string){return this.online.publicView(token);}
  @Public() @Post(":token/pay") @HttpCode(200) pay(@Param("token") token:string,@Body() b:any,@Headers("idempotency-key") key:string|undefined){return this.online.pay(token,b?.formData??b,key);}
}
