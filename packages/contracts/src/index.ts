export const pipelineStages = [
  "LEAD",
  "OPPORTUNITY",
  "QUOTE",
  "WORK_ORDER",
  "PROJECT",
] as const;

export type PipelineStage = (typeof pipelineStages)[number];

export const roles = [
  "GERENTE_GENERAL",
  "JEFE_VENTAS",
  "JEFE_DESARROLLO",
  "EJECUTIVA_VENTAS",
  "PROGRAMADOR",
  "RRHH",
  "FINANZAS",
  "COMERCIAL",
  "DESARROLLO",
  "OPERACIONES",
  "PORTAL_CLIENT",
] as const;

export type Role = (typeof roles)[number];

export interface UserDirectoryItem {
  id: string;
  email: string;
  name: string;
  role: Role | null;
  active: boolean;
}

export interface CommercialRecord {
  id: string;
  company: string;
  contact: string;
  title: string;
  valueClp: number;
  stage: PipelineStage;
  owner: string;
  updatedAt: string;
}

export interface PipelineSummary {
  records: CommercialRecord[];
  totalValueClp: number;
  activeCount: number;
  generatedAt: string;
}

export interface CreateCommercialRecord {
  company: string;
  contact: string;
  title: string;
  valueClp: number;
  stage?: PipelineStage;
  owner: string;
}

export const leadStatuses = ["NEW", "ASSIGNED", "CONTACT_PENDING", "CONTACTED", "QUALIFYING", "QUALIFIED", "DISQUALIFIED", "CONVERTED"] as const;
export type LeadStatus = (typeof leadStatuses)[number];
export const opportunityStatuses = ["OPEN", "WON", "LOST", "ARCHIVED"] as const;
export type OpportunityStatus = (typeof opportunityStatuses)[number];
export const followUpStatuses = ["PENDING", "OVERDUE", "COMPLETED", "CANCELLED"] as const;
export type FollowUpStatus = (typeof followUpStatuses)[number];
export const followUpTypes = ["CALL", "EMAIL", "WHATSAPP", "MEETING", "PROPOSAL", "FOLLOW_UP", "OTHER"] as const;
export type FollowUpType = (typeof followUpTypes)[number];
export const quoteStatuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "READY_TO_SEND", "SENT", "NEGOTIATING", "ACCEPTED", "DECLINED", "EXPIRED", "CONVERTED", "CANCELLED"] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];

export interface SalesPipeline { id:string; name:string; isDefault:boolean; active:boolean; }
export interface SalesPipelineStage { id:string; pipelineId:string; code:string; name:string; position:number; probability:number; kind:"OPEN"|"WON"|"LOST"; active:boolean; }
export interface SalesLead {
  id:string; companyName:string; contactName:string; email:string|null; phone:string|null; whatsapp:string|null; website:string|null; rut:string|null;
  sourceId:string|null; sourceName:string|null; campaign:string|null; interest:string|null; notes:string|null; assignedTo:string|null; status:LeadStatus;
  score:number|null; scoreReason:string; nextActionAt:string|null; clientId:string|null; assignedBy:string|null; assignedAt:string|null;
  createdBy:string|null; createdAt:string; updatedAt:string; archivedAt:string|null;
}
export interface SalesOpportunity {
  id:string; clientId:string|null; leadId:string|null; company:string; name:string; description:string|null; serviceCategory:string|null;
  ownerId:string|null; estimatedValue:number; currency:"CLP"|"UF"|"USD"; probability:number; pipelineId:string; stageId:string;
  stageName:string|null; expectedCloseDate:string|null; nextActionAt:string|null; status:OpportunityStatus; lostReasonId:string|null;
  lostExplanation:string|null; stageEnteredAt:string; createdAt:string; updatedAt:string;
}
export interface SalesFollowUp {
  id:string; leadId:string|null; opportunityId:string|null; clientId:string|null; assignedTo:string|null; type:FollowUpType; title:string;
  description:string|null; scheduledAt:string; completedAt:string|null; status:FollowUpStatus; outcome:string|null; createdBy:string|null; createdAt:string; updatedAt:string;
}
export interface QuoteItem { id:string; quoteId:string; catalogServiceId:string|null; description:string; quantity:number; unitPrice:number; discountPercent:number; taxable:boolean; subtotal:number; }
export interface SalesQuote {
  id:string; quoteNumber:string; version:number; clientId:string|null; leadId:string|null; opportunityId:string|null; companyName:string; contactName:string|null;
  contactEmail:string|null; ownerId:string|null; status:QuoteStatus; currency:"CLP"|"UF"|"USD"; subtotal:number; discountTotal:number; netAmount:number;
  taxRate:number; taxAmount:number; totalAmount:number; validUntil:string|null; paymentTerms:string|null; commercialTerms:string|null; notes:string|null;
  documentId:string|null; documentHash:string|null; sentAt:string|null; acceptedAt:string|null; saleId:string|null; createdAt:string; updatedAt:string; items:QuoteItem[];
}
export interface Sale {
  id:string; quoteId:string; quoteVersionId:string|null; opportunityId:string|null; clientId:string|null; amount:number; currency:string; ownerId:string|null;
  closedAt:string; contractId:string|null; workOrderId:string|null; status:"WON"|"CANCELLED"; createdAt:string;
}
export interface SalesGoal { id:string; userId:string|null; teamId:string|null; periodType:"MONTH"|"QUARTER"|"YEAR"; periodStart:string; periodEnd:string; goalType:"AMOUNT"|"SALES"|"NEW_CLIENTS"|"QUOTES"|"CONVERSION"; target:number; actual:number; createdAt:string; }
export interface Commission { id:string; saleId:string; userId:string; ruleId:string|null; baseAmount:number; amount:number; currency:string; status:"PENDING"|"ELIGIBLE"|"APPROVED"|"PAYABLE"|"PAID"|"CANCELLED"; createdAt:string; updatedAt:string; }
export interface SalesHandoff { id:string; saleId:string; clientId:string|null; quoteId:string; workOrderId:string|null; status:"DRAFT"|"READY"|"ACKNOWLEDGED"; scope:string; committedDeadline:string|null; risks:string|null; dependencies:string|null; commercialOwnerId:string|null; developmentOwnerId:string|null; overrideReason:string|null; createdAt:string; updatedAt:string; }
export interface CommercialEvent { id:string; aggregateType:string; aggregateId:string; eventType:string; actorId:string|null; payload:Record<string,unknown>; occurredAt:string; }
export interface CommercialSummary {
  newLeads:number; uncontactedLeads:number; overdueFollowUps:number; todayFollowUps:number; openOpportunities:number; staleOpportunities:number;
  pendingQuotes:number; expiringQuotes:number; approvalQuotes:number; monthSales:number; activePipeline:number; weightedPipeline:number; wonClients:number; lostOpportunities:number;
}

export const clientStatuses = ["ACTIVE", "ONBOARDING", "INACTIVE", "ARCHIVED"] as const;
export type ClientStatus = (typeof clientStatuses)[number];

export const clientHealthStatuses = ["HEALTHY", "ATTENTION", "RISK", "CRITICAL", "INSUFFICIENT_DATA"] as const;
export type ClientHealthStatus = (typeof clientHealthStatuses)[number];

export interface Client {
  id: string;
  legalName: string;
  tradeName: string | null;
  rut: string;
  businessActivity: string | null;
  website: string | null;
  phone: string | null;
  generalEmail: string | null;
  country: string;
  region: string | null;
  commune: string | null;
  address: string | null;
  accountExecutiveId: string | null;
  clientLeadId: string | null;
  developmentLeadId: string | null;
  source: string | null;
  clientType: string | null;
  status: ClientStatus;
  billingLegalName: string | null;
  billingRut: string | null;
  billingActivity: string | null;
  billingAddress: string | null;
  dteEmail: string | null;
  paymentTerms: string | null;
  creditDays: number;
  currency: string;
  paymentCustomerReference: string | null;
  health: ClientHealthStatus;
  healthFactors: ClientHealthFactor[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ClientHealthFactor {
  key: string;
  label: string;
  available: boolean;
  status: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNKNOWN";
  reason: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  position: string | null;
  department: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
  billingContact: boolean;
  technicalContact: boolean;
  commercialContact: boolean;
  portalAccess: boolean;
  status: "ACTIVE" | "INACTIVE";
  contactTypes: ContactType[];
  notes: string | null;
  portalStatus: PortalAccessStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ClientContactDirectoryItem extends ClientContact {
  clientName: string;
  clientRut: string;
}

export interface ContactDirectorySummary {
  total: number;
  primary: number;
  commercial: number;
  technical: number;
  billing: number;
  portal: number;
  withoutEmail: number;
  withoutPhone: number;
}

export interface ContactMutationResult {
  item: ClientContactDirectoryItem;
  duplicateWarnings: string[];
}

export const contactTypes = ["PRINCIPAL", "COMERCIAL", "TECNICO", "FACTURACION", "LEGAL", "GERENCIA", "OPERACIONES", "SOPORTE", "PORTAL"] as const;
export type ContactType = (typeof contactTypes)[number];
export type PortalAccessStatus = "PENDING_INVITATION" | "INVITED" | "ACTIVE" | "DISABLED";

export interface ServiceCatalogItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string | null;
  defaultPrice: number | null;
  currency: string;
  billingType: BillingFrequency;
  active: boolean;
  requiresProject: boolean;
  requiresMonitoring: boolean;
  requiresSupport: boolean;
  requiresRenewal: boolean;
  createdAt: string;
  updatedAt: string;
}

export const billingFrequencies = ["ONE_TIME", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "CUSTOM"] as const;
export type BillingFrequency = (typeof billingFrequencies)[number];
export const clientServiceStatuses = ["QUOTED", "PENDING_ACTIVATION", "ACTIVE", "SUSPENDED", "PENDING_RENEWAL", "CANCELLED", "EXPIRED"] as const;
export type ClientServiceStatus = (typeof clientServiceStatuses)[number];

export interface ClientService {
  id: string;
  clientId: string;
  serviceId: string;
  catalogServiceId: string | null;
  serviceName: string;
  contractId: string | null;
  projectId: string | null;
  startDate: string;
  activationDate: string | null;
  renewalDate: string | null;
  endDate: string | null;
  billingFrequency: BillingFrequency | null;
  agreedPrice: number | null;
  currency: string;
  status: ClientServiceStatus;
  responsibleUserId: string | null;
  technicalOwnerId: string | null;
  sla: string | null;
  notes: string | null;
  portalVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export const contractStatuses = ["DRAFT", "IN_REVIEW", "PENDING_SIGNATURE", "SIGNED", "ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED", "CANCELLED"] as const;
export type ContractStatus = (typeof contractStatuses)[number];
export type SignatureStatus = "NOT_CONFIGURED" | "DRAFT" | "REQUESTED" | "VIEWED" | "SIGNED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export interface ClientContract {
  id: string;
  contractNumber: string;
  clientId: string;
  clientName: string | null;
  name: string;
  description: string | null;
  contractType: string;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  renewalType: "NONE" | "MANUAL" | "AUTOMATIC";
  renewalNoticeDays: number;
  billingFrequency: BillingFrequency | null;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  signedAt: string | null;
  responsibleUserId: string | null;
  signatureStatus: SignatureStatus;
  signatureProvider: string | null;
  signatureRequestId: string | null;
  documentHash: string | null;
  portalVisible: boolean;
  version: number;
  parentContractId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ContractVersion {
  id: string;
  contractId: string;
  versionNumber: number;
  versionKind: "CONTRACT" | "ANNEX";
  title: string;
  storagePath: string | null;
  documentHash: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export const renewalStatuses = ["UPCOMING", "CONTACT_REQUIRED", "CONTACTED", "NEGOTIATING", "RENEWED", "NOT_RENEWED", "CANCELLED", "EXPIRED"] as const;
export type RenewalStatus = (typeof renewalStatuses)[number];
export type RenewalSourceType = "CONTRACT" | "SERVICE" | "HOSTING" | "DOMAIN" | "MAINTENANCE" | "LICENSE" | "SUBSCRIPTION" | "SUPPORT" | "AUDIT";

export interface ClientRenewal {
  id: string;
  clientId: string;
  clientName: string | null;
  sourceType: RenewalSourceType;
  sourceId: string;
  title: string;
  renewalDate: string;
  noticeDate: string | null;
  assignedTo: string | null;
  status: RenewalStatus;
  estimatedValue: number | null;
  currency: string;
  autoRenew: boolean;
  notes: string | null;
  opportunityId: string | null;
  outcome: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResponse<T, S = Record<string, number | null>> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: S;
}

export interface ClientEvent {
  id: string;
  clientId: string;
  type: string;
  title: string;
  description: string | null;
  actorId: string | null;
  visibility: "INTERNAL_ONLY" | "CLIENT_VISIBLE" | "CLIENT_SUMMARY_ONLY";
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface CreateClientInput {
  legalName: string;
  tradeName?: string;
  rut: string;
  businessActivity?: string;
  website?: string;
  phone?: string;
  generalEmail?: string;
  country: string;
  region?: string;
  commune?: string;
  address?: string;
  accountExecutiveId?: string;
  clientLeadId?: string;
  developmentLeadId?: string;
  source?: string;
  clientType?: string;
  status?: ClientStatus;
  billingLegalName?: string;
  billingRut?: string;
  billingActivity?: string;
  billingAddress?: string;
  dteEmail?: string;
  paymentTerms?: string;
  creditDays?: number;
  currency?: string;
  primaryContact?: Omit<ClientContact, "id" | "clientId" | "createdAt" | "updatedAt" | "archivedAt" | "portalStatus" | "contactTypes" | "notes"> & Partial<Pick<ClientContact, "contactTypes" | "notes">>;
  initialServices?: Array<Omit<ClientService, "id" | "clientId" | "activationDate" | "createdAt" | "updatedAt">>;
}

export interface ClientPortfolioSummary {
  active: number | null;
  newThisMonth: number | null;
  onboarding: number | null;
  activeProjects: number | null;
  criticalIncidents: number | null;
  pendingPayments: number | null;
  upcomingRenewals: number | null;
  inactiveRelationship: number | null;
}

export interface ClientListResponse {
  items: Client[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: ClientPortfolioSummary;
}

export interface ClientPortalSettings {
  clientId: string;
  enabled: boolean;
  projectsVisible: boolean;
  documentsVisible: boolean;
  invoicesVisible: boolean;
  ticketsVisible: boolean;
  monitoringVisible: boolean;
  auditsVisible: boolean;
  updatedAt: string;
}

export const workOrderStatuses = ["DRAFT", "READY_FOR_HANDOFF", "PENDING_PLANNING", "PLANNING", "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "WAITING_CLIENT", "COMPLETED", "CLOSED", "CANCELLED"] as const;
export type WorkOrderStatus = (typeof workOrderStatuses)[number];
export const operationPriorities = ["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"] as const;
export type OperationPriority = (typeof operationPriorities)[number];

export interface WorkOrder {
  id: string; workOrderNumber: string; clientId: string | null; clientName: string | null; quoteId: string | null; quoteVersionId: string | null;
  saleId: string | null; contractId: string | null; handoffId: string | null; projectId: string | null; title: string; description: string | null;
  scope: string; commercialSnapshot: Record<string, unknown>; priority: OperationPriority; status: WorkOrderStatus; commercialOwnerId: string | null;
  developmentManagerId: string | null; assignedTo: string | null; plannedStartDate: string | null; targetDate: string | null; actualStartDate: string | null;
  completedAt: string | null; estimatedHours: number | null; budgetReference: number | null; currency: string; createdBy: string | null; createdAt: string; updatedAt: string;
}

export const projectStatuses = ["PLANNING", "READY", "IN_PROGRESS", "BLOCKED", "INTERNAL_REVIEW", "QA", "WAITING_CLIENT", "READY_FOR_PRODUCTION", "PRODUCTION", "MAINTENANCE", "COMPLETED", "ON_HOLD", "CANCELLED", "ARCHIVED"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];
export const projectHealthStatuses = ["ON_TRACK", "ATTENTION", "AT_RISK", "CRITICAL", "COMPLETED"] as const;
export type ProjectHealth = (typeof projectHealthStatuses)[number];

export interface OperationsProject {
  id: string; projectNumber: string; clientId: string | null; clientName: string | null; workOrderId: string; quoteId: string | null; contractId: string | null;
  name: string; description: string | null; scope: string; status: ProjectStatus; priority: OperationPriority; health: ProjectHealth; healthReason: string;
  progress: number; developmentManagerId: string | null; projectLeadId: string | null; plannedStartDate: string | null; actualStartDate: string | null;
  targetDate: string | null; completedAt: string | null; estimatedHours: number | null; budgetedHours: number | null; stagingUrl: string | null;
  productionUrl: string | null; repositoryUrl: string | null; clientVisibility: "INTERNAL" | "CLIENT_VISIBLE"; createdBy: string | null; createdAt: string; updatedAt: string; archivedAt: string | null;
}

export type ProjectRole = "PROJECT_MANAGER" | "TECH_LEAD" | "DEVELOPER" | "QA" | "DESIGNER" | "SUPPORT" | "OBSERVER";
export interface ProjectMember { id: string; projectId: string; userId: string; userName: string | null; projectRole: ProjectRole; allocationPercentage: number | null; assignedBy: string | null; assignedAt: string; removedAt: string | null; active: boolean; }

export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "AT_RISK" | "BLOCKED" | "COMPLETED" | "CANCELLED";
export interface ProjectMilestone { id: string; projectId: string; name: string; description: string | null; status: MilestoneStatus; weight: number; plannedStartDate: string | null; dueDate: string | null; completedAt: string | null; responsibleUserId: string | null; clientVisibility: "INTERNAL" | "CLIENT_VISIBLE"; sortOrder: number; createdAt: string; updatedAt: string; }

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "QA" | "DONE" | "CANCELLED";
export interface OperationsTask { id: string; projectId: string; projectName: string | null; milestoneId: string | null; parentTaskId: string | null; title: string; description: string | null; status: TaskStatus; priority: OperationPriority; assignedTo: string | null; createdBy: string | null; estimatedMinutes: number | null; actualMinutes: number; startDate: string | null; dueDate: string | null; completedAt: string | null; blockedReason: string | null; blockedType: string | null; clientVisibility: "INTERNAL" | "CLIENT_VISIBLE"; overdue: boolean; createdAt: string; updatedAt: string; }
export interface TaskDependency { id: string; taskId: string; dependsOnTaskId: string; dependencyType: "BLOCKS" | "REQUIRES"; createdAt: string; }

export type WorkType = "DEVELOPMENT" | "DESIGN" | "MEETING" | "QA" | "SUPPORT" | "RESEARCH" | "DEPLOYMENT" | "DOCUMENTATION" | "MANAGEMENT" | "OTHER";
export interface WorkLog { id: string; projectId: string; projectName: string | null; taskId: string | null; userId: string; workDate: string; startedAt: string | null; durationMinutes: number; description: string; publicDescription: string | null; workType: WorkType; billable: boolean; clientVisibility: "INTERNAL" | "CLIENT_VISIBLE"; commitReference: string | null; deploymentId: string | null; createdAt: string; updatedAt: string; }

export type DeliverableStatus = "PLANNED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "INTERNAL_REVIEW" | "CLIENT_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "DELIVERED" | "CANCELLED";
export interface ProjectDeliverable { id: string; projectId: string; projectName: string | null; milestoneId: string | null; name: string; description: string | null; type: string; status: DeliverableStatus; dueDate: string | null; ownerId: string | null; documentId: string | null; externalUrl: string | null; version: number; clientVisibility: "INTERNAL" | "CLIENT_VISIBLE"; submittedAt: string | null; approvedAt: string | null; approvedBy: string | null; createdAt: string; updatedAt: string; }

export type DeploymentStatus = "PLANNED" | "QUEUED" | "IN_PROGRESS" | "SUCCESS" | "FAILED" | "ROLLED_BACK" | "CANCELLED";
export interface ProjectDeployment { id: string; projectId: string; projectName: string | null; environment: string; version: string; commitSha: string | null; status: DeploymentStatus; recordType: "MANUAL_RECORD" | "INTEGRATION"; requestedBy: string | null; deployedBy: string | null; startedAt: string | null; completedAt: string | null; notes: string | null; rollbackOfId: string | null; clientVisibility: "INTERNAL" | "CLIENT_VISIBLE"; createdAt: string; updatedAt: string; }

export interface ProjectEndpoint { id: string; projectId: string; name: string; url: string; environment: string; endpointType: string; monitoringEnabled: boolean; responsibleUserId: string | null; active: boolean; createdAt: string; updatedAt: string; }
export interface ProjectRisk { id: string; projectId: string; title: string; description: string | null; probability: number; impact: number; severity: number; ownerId: string | null; mitigation: string | null; status: "OPEN" | "MITIGATING" | "ACCEPTED" | "RESOLVED"; createdAt: string; resolvedAt: string | null; }
export interface ChangeRequest { id: string; projectId: string; requestedBy: string | null; source: string; description: string; reason: string | null; scopeImpact: string | null; timeImpact: string | null; costImpact: number | null; currency: string; status: "REQUESTED" | "ANALYSIS" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "IMPLEMENTING" | "COMPLETED"; approvedBy: string | null; approvedAt: string | null; createdAt: string; updatedAt: string; }
export interface OperationsEvent { id: string; projectId: string | null; workOrderId: string | null; aggregateType: string; aggregateId: string; eventType: string; actorId: string | null; payload: Record<string, unknown>; occurredAt: string; }

export interface OperationsSummary {
  newWorkOrders: number; pendingPlanning: number; activeProjects: number; atRiskProjects: number; overdueProjects: number; overdueTasks: number;
  blockedTasks: number; upcomingMilestones: number; overdueMilestones: number; pendingDeliverables: number; pendingDeployments: number;
  minutesToday: number; unassignedProjects: number;
}
export interface OperationsPriorityItem { id: string; type: "WORK_ORDER" | "PROJECT" | "TASK" | "MILESTONE" | "DELIVERABLE" | "DEPLOYMENT"; title: string; reason: string; severity: "ATTENTION" | "AT_RISK" | "CRITICAL"; href: string; dueAt: string | null; }
export interface ProjectOperationalSummary { project: OperationsProject; nextMilestone: ProjectMilestone | null; openTasks: number; overdueTasks: number; blockedTasks: number; usedMinutes: number; remainingMinutes: number | null; members: number; pendingDeliverables: number; activeRisks: number; }
