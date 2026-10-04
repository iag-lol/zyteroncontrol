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
  "TECH_LEAD",
  "QA",
  "SOPORTE_TECNICO",
  "RRHH",
  "FINANZAS",
  "CONTADOR",
  "COMERCIAL",
  "DESARROLLO",
  "OPERACIONES",
  "SECURITY_ADMIN",
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
  projectId?: string | null;
  quoteId?: string | null;
  quoteVersionId?: string | null;
  independentReason?: string | null;
  templateCodes?: string[];
  builderValues?: Record<string, unknown>;
  sourceSnapshot?: Record<string, unknown>;
  legalReviewStatus?: "REQUIRED" | "IN_REVIEW" | "APPROVED" | "CHANGES_REQUIRED";
  approvalStatus?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  effectiveStatus?: "NOT_STARTED" | "EFFECTIVE" | "SUSPENDED" | "ENDED";
  complianceStatus?: "NOT_ASSESSED" | "COMPLIANT" | "AT_RISK" | "BREACHED" | "REMEDIATED";
  collectionStatus?: "NOT_DUE" | "DUE" | "PARTIAL" | "PAID" | "OVERDUE" | "DISPUTED";
  frozenAt?: string | null;
  frozenHash?: string | null;
  originalDocumentId?: string | null;
  signedDocumentId?: string | null;
  signedDocumentHash?: string | null;
  signatureEvidence?: Record<string, unknown>;
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

export type DeploymentStatus = "PLANNED" | "READY" | "PENDING_APPROVAL" | "QUEUED" | "BUILDING" | "IN_PROGRESS" | "DEPLOYING" | "VERIFYING" | "SUCCESS" | "BUILD_FAILED" | "DEPLOY_FAILED" | "HEALTH_CHECK_FAILED" | "FAILED" | "ROLLED_BACK" | "CANCELLED";
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

export type DeveloperAvailability = "AVAILABLE" | "PARTIAL" | "FULL" | "AWAY" | "OFFLINE";
export interface DeveloperSkill { id:string; userId:string; skill:string; level:"BEGINNER"|"INTERMEDIATE"|"ADVANCED"|"EXPERT"; verifiedBy:string|null; updatedAt:string; }
export interface DevelopmentTeamMember { userId:string; name:string; role:Role|null; availability:DeveloperAvailability; activeProjects:number; openTasks:number; blockedTasks:number; plannedHours:number; allocation:number; nextDeadline:string|null; skills:DeveloperSkill[]; }
export interface AssignmentRecommendation { userId:string; name:string; allocation:number; activeProjects:number; matchingSkills:string[]; reasons:string[]; }
export interface DevelopmentAssignment { project:OperationsProject; members:ProjectMember[]; technologies:ProjectTechnology[]; recommendation:AssignmentRecommendation|null; }

export interface ProjectRepository { id:string; projectId:string; projectName:string|null; provider:string; repositoryOwner:string; repositoryName:string; repositoryUrl:string; defaultBranch:string; integrationStatus:"NOT_CONFIGURED"|"CONNECTED"|"ERROR"|"DISCONNECTED"; visibility:"PRIVATE"|"INTERNAL"|"PUBLIC"; createdAt:string; updatedAt:string; }
export interface ProjectTechnology { id:string; projectId:string; category:"FRONTEND"|"BACKEND"|"DATABASE"|"HOSTING"|"INTEGRATION"|"LANGUAGE"|"FRAMEWORK"|"OTHER"; name:string; version:string|null; createdAt:string; }
export interface ProjectEnvironment { id:string; projectId:string; projectName:string|null; name:string; type:"LOCAL"|"DEVELOPMENT"|"STAGING"|"PRODUCTION"; url:string|null; status:"UNKNOWN"|"HEALTHY"|"DEGRADED"|"DOWN"|"MAINTENANCE"; deploymentProvider:string|null; externalReference:string|null; lastDeploymentId:string|null; responsibleUserId:string|null; createdAt:string; updatedAt:string; }
export interface PullRequest { id:string; repositoryId:string; projectId:string; projectName:string|null; externalId:string; number:number; title:string; author:string|null; reviewers:string[]; sourceBranch:string; targetBranch:string; checksStatus:"PASS"|"FAIL"|"PENDING"|"UNKNOWN"; status:"OPEN"|"REVIEW_REQUIRED"|"CHANGES_REQUESTED"|"APPROVED"|"MERGED"|"CLOSED"; providerUrl:string|null; openedAt:string; updatedAt:string; }

export type QaRunStatus = "PLANNED"|"IN_PROGRESS"|"PASSED"|"PASSED_WITH_OBSERVATIONS"|"FAILED"|"BLOCKED"|"CANCELLED";
export interface QaRun { id:string; projectId:string; projectName:string|null; releaseId:string|null; environmentId:string|null; name:string; status:QaRunStatus; startedBy:string|null; assignedTo:string|null; startedAt:string|null; completedAt:string|null; result:string|null; notes:string|null; createdAt:string; updatedAt:string; }
export interface QaTestCase { id:string; projectId:string; suite:string; title:string; description:string|null; preconditions:string|null; expectedResult:string; priority:"LOW"|"NORMAL"|"HIGH"|"CRITICAL"; active:boolean; createdAt:string; updatedAt:string; }
export interface QaTestResult { id:string; qaRunId:string; testCaseId:string; status:"PASS"|"FAIL"|"BLOCKED"|"SKIPPED"; actualResult:string|null; evidenceDocumentId:string|null; executedBy:string|null; executedAt:string; }

export type BugStatus = "NEW"|"TRIAGED"|"ASSIGNED"|"IN_PROGRESS"|"READY_FOR_QA"|"REOPENED"|"RESOLVED"|"CLOSED"|"WONT_FIX"|"DUPLICATE";
export interface DevelopmentBug { id:string; projectId:string; projectName:string|null; taskId:string|null; title:string; description:string; severity:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"|"BLOCKER"; priority:"LOW"|"NORMAL"|"HIGH"|"URGENT"|"CRITICAL"; environment:string|null; status:BugStatus; reportedBy:string|null; assignedTo:string|null; stepsToReproduce:string|null; expectedBehavior:string|null; actualBehavior:string|null; evidenceDocumentId:string|null; clientVisibility:"INTERNAL_ONLY"|"CLIENT_SUMMARY"|"CLIENT_VISIBLE"; detectedAt:string; resolvedAt:string|null; createdAt:string; updatedAt:string; }
export interface BugHistory { id:string; bugId:string; field:string; fromValue:string|null; toValue:string|null; reason:string|null; changedBy:string|null; changedAt:string; }

export type ReleaseStatus = "DRAFT"|"PLANNED"|"READY"|"PENDING_APPROVAL"|"DEPLOYING"|"RELEASED"|"FAILED"|"ROLLED_BACK"|"CANCELLED";
export interface DevelopmentRelease { id:string; projectId:string; projectName:string|null; version:string; name:string; status:ReleaseStatus; targetEnvironment:string; plannedAt:string|null; releasedAt:string|null; createdBy:string|null; approvedBy:string|null; releaseNotes:string|null; commitSha:string|null; deploymentId:string|null; clientVisibility:"INTERNAL_ONLY"|"CLIENT_SUMMARY"|"CLIENT_VISIBLE"; createdAt:string; updatedAt:string; }
export interface TechnicalDebtItem { id:string; projectId:string; projectName:string|null; title:string; description:string; impact:string|null; severity:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; estimatedEffort:number|null; status:"OPEN"|"PLANNED"|"IN_PROGRESS"|"RESOLVED"|"ACCEPTED"; ownerId:string|null; targetDate:string|null; createdAt:string; updatedAt:string; }
export interface IntegrationConnection { id:string; provider:"GITHUB"|"RENDER"|"SUPABASE"|"EMAIL"|string; status:"NOT_CONFIGURED"|"CONNECTED"|"ERROR"|"DISCONNECTED"; displayName:string; externalReference:string|null; lastSyncAt:string|null; lastError:string|null; createdAt:string; updatedAt:string; }
export interface DevelopmentEvent { id:string; projectId:string|null; aggregateType:string; aggregateId:string; eventType:string; actorId:string|null; payload:Record<string,unknown>; occurredAt:string; }
export interface DevelopmentSummary { unassignedProjects:number; activeProjects:number; availableDevelopers:number; overloadedDevelopers:number; blockedTasks:number; pendingPullRequests:number; pendingQa:number; criticalBugs:number; failedDeployments:number; upcomingReleases:number; productionPending:number; technicalIncidents:number; }
export interface DevelopmentAttentionItem { id:string; type:"DEPLOYMENT"|"BUG"|"PROJECT"|"TASK"|"QA"|"PULL_REQUEST"|"RELEASE"|"ENVIRONMENT"; title:string; reason:string; severity:"ATTENTION"|"AT_RISK"|"CRITICAL"; href:string; occurredAt:string|null; }
export interface DevelopmentProjectSnapshot { project:OperationsProject; members:ProjectMember[]; technologies:ProjectTechnology[]; repositories:ProjectRepository[]; environments:ProjectEnvironment[]; pullRequests:PullRequest[]; qaRuns:QaRun[]; bugs:DevelopmentBug[]; releases:DevelopmentRelease[]; deployments:ProjectDeployment[]; techHealth:"HEALTHY"|"ATTENTION"|"AT_RISK"|"CRITICAL"; healthReasons:string[]; }

export const auditTypes = ["WEB_GENERAL","SEGURIDAD","SEO","PERFORMANCE","ACCESSIBILITY","INFRASTRUCTURE","INTEGRATIONS","BACKUP","MAINTENANCE","PROJECT_DELIVERY","SERVICE_REVIEW","CUSTOM"] as const;
export type AuditType = (typeof auditTypes)[number];
export const auditFrequencies = ["ONE_TIME","WEEKLY","MONTHLY","QUARTERLY","SEMIANNUAL","ANNUAL","CUSTOM"] as const;
export type AuditFrequency = (typeof auditFrequencies)[number];
export const auditStatuses = ["SCHEDULED","READY","IN_PROGRESS","WAITING_INFORMATION","IN_REVIEW","REMEDIATION_REQUIRED","RETEST_REQUIRED","COMPLETED","CANCELLED"] as const;
export type AuditStatus = (typeof auditStatuses)[number];
export const auditCheckStatuses = ["NOT_STARTED","PASS","PASS_WITH_OBSERVATION","FAIL","NOT_APPLICABLE","BLOCKED"] as const;
export type AuditCheckStatus = (typeof auditCheckStatuses)[number];
export const findingSeverities = ["INFO","LOW","MEDIUM","HIGH","CRITICAL"] as const;
export type FindingSeverity = (typeof findingSeverities)[number];
export const findingStatuses = ["OPEN","ACKNOWLEDGED","ASSIGNED","IN_REMEDIATION","READY_FOR_RETEST","RETEST_FAILED","RESOLVED","ACCEPTED_RISK","NOT_APPLICABLE","CLOSED"] as const;
export type FindingStatus = (typeof findingStatuses)[number];

export interface AuditPlan { id:string; clientId:string; clientName:string|null; projectId:string|null; projectName:string|null; serviceId:string|null; name:string; auditType:AuditType; templateId:string; frequency:AuditFrequency; customIntervalDays:number|null; responsibleUserId:string|null; reviewerUserId:string|null; startDate:string; nextRunAt:string|null; active:boolean; clientVisibility:"INTERNAL_ONLY"|"CLIENT_SUMMARY"|"CLIENT_VISIBLE"; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface AuditTemplate { id:string; code:string; name:string; auditType:AuditType; description:string|null; active:boolean; currentVersion:number; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface AuditTemplateVersion { id:string; templateId:string; version:number; status:"DRAFT"|"PUBLISHED"|"RETIRED"; changeSummary:string|null; publishedAt:string|null; publishedBy:string|null; createdAt:string; }
export interface AuditTemplateSection { id:string; templateVersionId:string; code:string; title:string; description:string|null; weight:number; sortOrder:number; }
export interface AuditTemplateCheck { id:string; templateVersionId:string; sectionId:string; code:string; title:string; description:string|null; checkType:"MANUAL"|"AUTOMATED"|"HYBRID"; required:boolean; weight:number; severityOnFailure:FindingSeverity; instructions:string|null; automationKey:string|null; autoCreateFinding:boolean; evidenceRequired:boolean; sortOrder:number; }
export interface AuditRun { id:string; auditNumber:string; planId:string|null; clientId:string; clientName:string|null; projectId:string|null; projectName:string|null; serviceId:string|null; templateVersionId:string; auditType:AuditType; status:AuditStatus; scheduledAt:string; startedAt:string|null; completedAt:string|null; responsibleUserId:string|null; reviewerUserId:string|null; score:number|null; progress:number; clientVisibility:"INTERNAL_ONLY"|"CLIENT_SUMMARY"|"CLIENT_VISIBLE"; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface AuditCheckResult { id:string; auditId:string; checkId:string; sectionCode:string|null; sectionTitle:string|null; checkCode:string|null; checkTitle:string|null; status:AuditCheckStatus; notes:string|null; notApplicableReason:string|null; evidenceRequired:boolean; executedBy:string|null; executedAt:string|null; automationSource:string|null; weight:number; severityOnFailure:FindingSeverity; findingId:string|null; }
export interface AuditEvidence { id:string; auditId:string; findingId:string|null; checkResultId:string|null; documentId:string|null; storagePath:string|null; evidenceType:"SCREENSHOT"|"PDF"|"IMAGE"|"SAFE_LOG_EXTRACT"|"URL"|"TEXT"|"REPORT"; title:string; description:string|null; filename:string|null; mimeType:string|null; sizeBytes:number|null; sha256:string|null; externalUrl:string|null; textContent:string|null; visibility:"INTERNAL_ONLY"|"CLIENT_VISIBLE"; uploadedBy:string|null; uploadedAt:string; }
export interface AuditFinding { id:string; findingNumber:string; auditId:string; auditNumber:string|null; clientId:string; clientName:string|null; projectId:string|null; projectName:string|null; checkResultId:string|null; category:string; title:string; description:string; severity:FindingSeverity; priority:"LOW"|"NORMAL"|"HIGH"|"URGENT"|"CRITICAL"; status:FindingStatus; responsibleUserId:string|null; dueDate:string|null; recommendation:string|null; internalNotes:string|null; clientSummary:string|null; clientVisibility:"INTERNAL_ONLY"|"CLIENT_SUMMARY"|"CLIENT_VISIBLE"; taskId:string|null; bugId:string|null; acceptedRiskReason:string|null; acceptedRiskBy:string|null; riskReviewAt:string|null; createdAt:string; resolvedAt:string|null; updatedAt:string; }
export interface AuditRemediation { id:string; findingId:string; ownerId:string|null; actionPlan:string; status:"PLANNED"|"IN_PROGRESS"|"BLOCKED"|"READY_FOR_RETEST"|"COMPLETED"|"CANCELLED"; targetDate:string|null; taskId:string|null; bugId:string|null; startedAt:string|null; completedAt:string|null; createdAt:string; updatedAt:string; }
export interface AuditRetest { id:string; findingId:string; performedBy:string|null; performedAt:string; result:"PASS"|"FAIL"|"BLOCKED"; notes:string; evidenceId:string|null; createdAt:string; }
export interface AuditReport { id:string; auditId:string; version:number; reportType:"INTERNAL"|"CLIENT"; status:"DRAFT"|"REVIEW"|"APPROVED"|"PUBLISHED"; documentId:string|null; sha256:string; templateVersionId:string; auditSnapshot:Record<string,unknown>; generatedBy:string|null; generatedAt:string; approvedBy:string|null; approvedAt:string|null; publishedAt:string|null; }
export interface AuditEvent { id:string; auditId:string|null; findingId:string|null; aggregateType:string; aggregateId:string; eventType:string; actorId:string|null; payload:Record<string,unknown>; occurredAt:string; }
export interface AuditSummary { scheduled:number; overdue:number; inProgress:number; pendingReview:number; openFindings:number; criticalFindings:number; overdueRemediations:number; pendingRetests:number; pendingReports:number; nextAuditAt:string|null; completionRate:number|null; retestSuccessRate:number|null; averageResolutionHours:number|null; }
export interface AuditAttentionItem { id:string; type:"AUDIT"|"FINDING"|"REMEDIATION"|"RETEST"|"REPORT"|"EVIDENCE"; title:string; reason:string; severity:"ATTENTION"|"AT_RISK"|"CRITICAL"; href:string; dueAt:string|null; }
export interface AuditWorkspace { summary:AuditSummary; attention:AuditAttentionItem[]; audits:AuditRun[]; plans:AuditPlan[]; findings:AuditFinding[]; remediations:AuditRemediation[]; evidence:AuditEvidence[]; templates:AuditTemplate[]; reports:AuditReport[]; activity:AuditEvent[]; }
export interface RelatedAuditSnapshot { nextAudit:AuditRun|null; lastAudit:AuditRun|null; audits:AuditRun[]; openFindings:AuditFinding[]; criticalFindings:number; remediations:AuditRemediation[]; reports:AuditReport[]; }

export const supportTicketStatuses=["NEW","TRIAGE","OPEN","ASSIGNED","IN_PROGRESS","WAITING_CLIENT","WAITING_INTERNAL","WAITING_THIRD_PARTY","RESOLVED","CLOSED","CANCELLED","REOPENED"] as const;
export type SupportTicketStatus=(typeof supportTicketStatuses)[number];
export const supportTicketTypes=["INCIDENT","SERVICE_REQUEST","TECHNICAL_SUPPORT","BUG_REPORT","FEATURE_REQUEST","CHANGE_REQUEST","ACCESS_REQUEST","BILLING_QUERY","DOCUMENT_REQUEST","CONSULTATION","COMPLAINT","OTHER"] as const;
export type SupportTicketType=(typeof supportTicketTypes)[number];
export type SupportRequesterType="CLIENT"|"INTERNAL_USER"|"SYSTEM"|"MONITORING"|"EMAIL"|"PORTAL";
export type SupportChannel="PORTAL"|"EMAIL"|"PHONE"|"WHATSAPP"|"INTERNAL"|"MONITORING"|"API";
export type SupportPriority="LOW"|"NORMAL"|"HIGH"|"URGENT";
export type SupportSeverity="INFO"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
export type SupportPrivacy="NORMAL"|"CONFIDENTIAL"|"RESTRICTED";
export type SupportMessageVisibility="PUBLIC_REPLY"|"INTERNAL_NOTE"|"SYSTEM_EVENT";
export interface SupportTicket { id:string; ticketNumber:string; requesterType:SupportRequesterType; clientId:string|null; clientName:string|null; clientContactId:string|null; contactName:string|null; requesterUserId:string|null; projectId:string|null; projectName:string|null; serviceId:string|null; subject:string; description:string; ticketType:SupportTicketType; categoryId:string|null; categoryName:string|null; subcategoryId:string|null; channel:SupportChannel; priority:SupportPriority; severity:SupportSeverity; status:SupportTicketStatus; queueId:string|null; queueName:string|null; assignedTo:string|null; teamId:string|null; slaPolicyId:string|null; firstResponseDueAt:string|null; resolutionDueAt:string|null; firstRespondedAt:string|null; resolvedAt:string|null; closedAt:string|null; resolutionCode:string|null; resolutionSummary:string|null; rootCause:string|null; clientVisibility:"INTERNAL_ONLY"|"CLIENT_VISIBLE"; privacy:SupportPrivacy; reopenedCount:number; archivedAt:string|null; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface SupportMessage { id:string; ticketId:string; authorType:"AGENT"|"CLIENT"|"INTERNAL_USER"|"SYSTEM"; authorUserId:string|null; authorContactId:string|null; messageType:"MESSAGE"|"CALL_NOTE"|"EMAIL"|"PORTAL_REPLY"; body:string; visibility:SupportMessageVisibility; providerMessageId:string|null; deliveryStatus:"NOT_REQUIRED"|"PENDING"|"SENT"|"DELIVERY_FAILED"; callDurationMinutes:number|null; callOutcome:string|null; createdAt:string; editedAt:string|null; }
export interface SupportQueue { id:string; code:string; name:string; description:string|null; teamId:string|null; privacyScope:SupportPrivacy; assignmentStrategy:"ROUND_ROBIN"|"LEAST_LOADED"|"PROJECT_OWNER"|"SERVICE_OWNER"|"MANUAL"; active:boolean; createdAt:string; updatedAt:string; }
export interface SupportCategory { id:string; code:string; name:string; active:boolean; sortOrder:number; createdAt:string; updatedAt:string; }
export interface SupportRoutingRule { id:string; name:string; ticketType:SupportTicketType|null; categoryId:string|null; channel:SupportChannel|null; clientId:string|null; queueId:string; priority:SupportPriority|null; active:boolean; position:number; createdAt:string; updatedAt:string; }
export interface SupportBusinessCalendar { id:string; name:string; timezone:string; mode:"TWENTY_FOUR_SEVEN"|"BUSINESS_HOURS"|"CUSTOM"; workingDays:number[]; workingHours:{start:string;end:string}; holidays:string[]; active:boolean; createdAt:string; updatedAt:string; }
export interface SupportSlaPolicy { id:string; code:string; name:string; scopeType:"GLOBAL"|"CLIENT"|"SERVICE"|"CONTRACT"; scopeId:string|null; calendarId:string; pauseStatuses:SupportTicketStatus[]; active:boolean; createdAt:string; updatedAt:string; }
export interface SupportSlaTarget { id:string; policyId:string; priority:SupportPriority; firstResponseMinutes:number; resolutionMinutes:number; updateFrequencyMinutes:number|null; warningPercent:number; escalationPercent:number; createdAt:string; updatedAt:string; }
export interface SupportSlaClock { target:"FIRST_RESPONSE"|"RESOLUTION"; dueAt:string|null; completedAt:string|null; paused:boolean; remainingMinutes:number|null; breached:boolean; consumptionPercent:number|null; }
export interface SupportSlaSnapshot { ticketId:string; firstResponse:SupportSlaClock; resolution:SupportSlaClock; policy:SupportSlaPolicy|null; }
export interface SupportMacro { id:string; name:string; body:string; status:SupportTicketStatus|null; categoryId:string|null; tags:string[]; active:boolean; createdAt:string; updatedAt:string; }
export interface KnowledgeArticle { id:string; categoryId:string|null; title:string; slug:string; summary:string; status:"DRAFT"|"REVIEW"|"PUBLISHED"|"ARCHIVED"; visibility:"INTERNAL"|"CLIENT"|"PUBLIC"; currentVersion:number; authorId:string|null; reviewerId:string|null; publishedAt:string|null; createdAt:string; updatedAt:string; }
export interface KnowledgeVersion { id:string; articleId:string; version:number; content:string; changeSummary:string|null; createdBy:string|null; createdAt:string; }
export interface SupportCsat { id:string; ticketId:string; rating:number; comment:string|null; submittedAt:string; }
export interface SupportSummary { newTickets:number; unassigned:number; awaitingFirstResponse:number; slaAtRisk:number; slaBreached:number; critical:number; waitingClient:number; waitingThirdParty:number; reopened:number; resolvedToday:number; internalPending:number; openTickets:number; averageFirstResponseMinutes:number|null; averageResolutionMinutes:number|null; slaCompliance:number|null; reopenRate:number|null; csat:number|null; }
export interface SupportAttentionItem { id:string; ticketNumber:string; subject:string; clientName:string|null; status:SupportTicketStatus; priority:SupportPriority; severity:SupportSeverity; assignedTo:string|null; reason:string; score:number; dueAt:string|null; }
export interface SupportAgentWorkload { userId:string; name:string; assigned:number; weightedLoad:number; breached:number; urgent:number; }
export interface SupportWorkspace { summary:SupportSummary; attention:SupportAttentionItem[]; tickets:SupportTicket[]; queues:SupportQueue[]; categories:SupportCategory[]; workloads:SupportAgentWorkload[]; slaPolicies:SupportSlaPolicy[]; macros:SupportMacro[]; knowledge:KnowledgeArticle[]; satisfaction:SupportCsat[]; generatedAt:string; }
export interface SupportTicketDetail { ticket:SupportTicket; messages:SupportMessage[]; sla:SupportSlaSnapshot; relations:Array<{id:string;relationType:string;relatedId:string;metadata:Record<string,unknown>}>; history:Array<{id:string;fromStatus:SupportTicketStatus|null;toStatus:SupportTicketStatus;reason:string|null;actorId:string|null;occurredAt:string}>; context:Record<string,unknown>|null; knowledge:KnowledgeArticle[]; }
export interface RelatedSupportSnapshot { clientId?:string; projectId?:string; serviceId?:string; tickets:SupportTicket[]; open:number; critical:number; breached:number; lastTicketAt:string|null; averageFirstResponseMinutes:number|null; csat:number|null; }

export const documentClassifications=["PUBLIC","CLIENT","INTERNAL","CONFIDENTIAL","RESTRICTED","CRITICAL"] as const;
export type DocumentClassification=(typeof documentClassifications)[number];
export const documentStatuses=["DRAFT","IN_REVIEW","CHANGES_REQUESTED","APPROVED","READY_FOR_SIGNATURE","SIGNING","SIGNED","PUBLISHED","SUPERSEDED","ARCHIVED","REJECTED","TRASHED"] as const;
export type DocumentStatus=(typeof documentStatuses)[number];
export type DocumentMalwareStatus="PENDING"|"CLEAN"|"SUSPICIOUS"|"INFECTED"|"SCAN_FAILED"|"NOT_CONFIGURED";
export type DocumentLinkType="CLIENT"|"PROJECT"|"CONTRACT"|"QUOTE"|"WORK_ORDER"|"FINANCE"|"AUDIT"|"SUPPORT"|"DEVELOPMENT"|"MONITORING"|"HR"|"OTHER";
export interface EnterpriseDocument { id:string; documentNumber:string|null; title:string; description:string|null; typeId:string; typeCode:string|null; typeName:string|null; classification:DocumentClassification; status:DocumentStatus; ownerId:string|null; currentVersionId:string|null; currentVersionNumber:number; clientVisible:boolean; expiresAt:string|null; retentionPolicyId:string|null; legalHold:boolean; archivedAt:string|null; trashedAt:string|null; purgeAfter:string|null; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface DocumentVersion { id:string; documentId:string; versionNumber:number; filename:string; storagePath:string; mimeType:string; detectedMimeType:string|null; sizeBytes:number; sha256:string; malwareStatus:DocumentMalwareStatus; status:"AVAILABLE"|"LOCKED"|"QUARANTINED"|"REJECTED"; changeSummary:string|null; lockedAt:string|null; signedAt:string|null; createdBy:string|null; createdAt:string; }
export interface DocumentLink { id:string; documentId:string; linkType:DocumentLinkType; linkedId:string; label:string|null; primaryLink:boolean; createdBy:string|null; createdAt:string; }
export interface DocumentReview { id:string; documentId:string; versionId:string; reviewerId:string; sequence:number; mode:"SEQUENTIAL"|"PARALLEL"; status:"PENDING"|"APPROVED"|"CHANGES_REQUESTED"|"REJECTED"|"CANCELLED"; comment:string|null; decidedAt:string|null; createdAt:string; }
export interface DocumentSignatureRequest { id:string; documentId:string; versionId:string; provider:string; providerRequestId:string|null; status:"NOT_CONFIGURED"|"DRAFT"|"SENT"|"IN_PROGRESS"|"COMPLETED"|"DECLINED"|"CANCELLED"|"EXPIRED"|"FAILED"; frozenSha256:string; evidence:Record<string,unknown>; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface DocumentActivity { id:string; documentId:string|null; eventType:string; actorId:string|null; payload:Record<string,unknown>; occurredAt:string; }
export interface DocumentType { id:string; code:string; name:string; description:string|null; maxSizeBytes:number; allowedMimeTypes:string[]; requiresApproval:boolean; allowsClientSharing:boolean; active:boolean; }
export interface DocumentTemplate { id:string; code:string; version?:number; name:string; bodyHtml?:string; description?:string|null; active:boolean; classification?:DocumentClassification; createdAt:string; }
export interface DocumentAttentionItem { id:string; type:"REVIEW"|"SIGNATURE"|"EXPIRY"|"QUARANTINE"|"RETENTION"; title:string; reason:string; severity:"ATTENTION"|"AT_RISK"|"CRITICAL"; href:string; dueAt:string|null; }
export interface DocumentSummary { total:number; mine:number; shared:number; pendingReview:number; pendingSignature:number; expiring:number; quarantined:number; archived:number; trash:number; storageBytes:number; }
export interface DocumentWorkspace { summary:DocumentSummary; attention:DocumentAttentionItem[]; documents:EnterpriseDocument[]; types:DocumentType[]; reviews:DocumentReview[]; signatures:DocumentSignatureRequest[]; templates:DocumentTemplate[]; activity:DocumentActivity[]; providers:{malware:string;signature:string;rendering:string;textExtraction:string;ocr:string}; generatedAt:string; }
export interface DocumentDetail { document:EnterpriseDocument; versions:DocumentVersion[]; links:DocumentLink[]; reviews:DocumentReview[]; signatures:DocumentSignatureRequest[]; relationships:Array<{id:string;relationshipType:string;relatedDocumentId:string;createdAt:string}>; comments:Array<{id:string;body:string;authorId:string|null;createdAt:string}>; permissions:Array<{id:string;subjectType:string;subjectId:string;permission:string;createdAt:string}>; activity:DocumentActivity[]; duplicateWarnings:string[]; }
export interface RelatedDocumentsSnapshot { clientId?:string; projectId?:string; linkType?:DocumentLinkType; documents:EnterpriseDocument[]; total:number; expiring:number; pendingReview:number; pendingSignature:number; }

export const employeeStatuses=["PRE_HIRE","ONBOARDING","ACTIVE","LEAVE","SUSPENDED","OFFBOARDING","TERMINATED","ARCHIVED"] as const;
export type EmployeeStatus=(typeof employeeStatuses)[number];
export type EmploymentType="INDEFINITE"|"FIXED_TERM"|"PART_TIME"|"INTERNSHIP"|"OTHER_LEGAL_RELATIONSHIP";
export interface Employee { id:string; userId:string|null; employeeNumber:string; rut:string; firstName:string; middleName:string|null; lastName:string; secondLastName:string|null; preferredName:string|null; personalEmail:string|null; corporateEmail:string|null; phone:string|null; birthDate:string|null; nationality:string|null; address:string|null; region:string|null; commune:string|null; emergencyContact:Record<string,unknown>; status:EmployeeStatus; hireDate:string|null; terminationDate:string|null; privacyLevel:"HR_CONFIDENTIAL"; archivedAt:string|null; createdAt:string; updatedAt:string; }
export interface EmploymentRelationship { id:string; employeeId:string; companyEntityId:string|null; employmentType:EmploymentType; startDate:string; endDate:string|null; status:"PLANNED"|"ACTIVE"|"SUSPENDED"|"ENDED"; jobPositionId:string|null; departmentId:string|null; teamId:string|null; managerId:string|null; workLocation:string|null; costCenterId:string|null; weeklyHours:number|null; scheduleType:string|null; createdAt:string; updatedAt:string; }
export interface HrDepartment { id:string; name:string; code:string; managerId:string|null; parentDepartmentId:string|null; costCenterId:string|null; active:boolean; createdAt:string; updatedAt:string; }
export interface HrTeam { id:string; departmentId:string; name:string; teamLeadId:string|null; active:boolean; createdAt:string; updatedAt:string; }
export interface JobPosition { id:string; name:string; code:string; departmentId:string|null; description:string|null; level:string|null; reportsToPositionId:string|null; defaultPermissionsProfile:string|null; active:boolean; createdAt:string; updatedAt:string; }
export const employmentContractStatuses=["DRAFT","IN_REVIEW","READY_FOR_SIGNATURE","SIGNATURE_REQUESTED","PARTIALLY_SIGNED","SIGNED","PENDING_DT_REGISTRATION","REGISTERED","ACTIVE","EXPIRED","TERMINATED","SUPERSEDED","CANCELLED"] as const;
export type EmploymentContractStatus=(typeof employmentContractStatuses)[number];
export interface EmploymentContract { id:string; employeeId:string; employmentRelationshipId:string; contractNumber:string; contractType:EmploymentType; status:EmploymentContractStatus; startDate:string; endDate:string|null; positionId:string|null; departmentId:string|null; workLocation:string|null; weeklyHours:number|null; scheduleDefinition:Record<string,unknown>; baseSalary?:number|null; currency:string; paymentFrequency:string; documentId:string|null; signatureStatus:string; signatureProvider:string|null; signedAt:string|null; dtRegistrationStatus:string; dtRegistrationReference:string|null; dtRegisteredAt:string|null; dtReceiptDocumentId:string|null; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface EmploymentAnnex { id:string; employmentContractId:string; employeeId:string; documentId:string|null; annexType:"SALARY_CHANGE"|"POSITION_CHANGE"|"SCHEDULE_CHANGE"|"REMOTE_WORK"|"BENEFIT_CHANGE"|"LOCATION_CHANGE"|"OTHER"; effectiveDate:string; status:"DRAFT"|"IN_REVIEW"|"READY_FOR_SIGNATURE"|"SIGNATURE_REQUESTED"|"SIGNED"|"ACTIVE"|"SUPERSEDED"|"CANCELLED"; payload:Record<string,unknown>; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface OnboardingInstance { id:string; employeeId:string; templateId:string|null; status:"NOT_STARTED"|"IN_PROGRESS"|"BLOCKED"|"COMPLETED"|"CANCELLED"; targetDate:string|null; progress:number; startedAt:string|null; completedAt:string|null; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface OffboardingInstance { id:string; employeeId:string; effectiveDate:string; reasonCategory:string; status:"INITIATED"|"APPROVED"|"IN_PROGRESS"|"BLOCKED"|"READY_TO_FINALIZE"|"COMPLETED"|"CANCELLED"; criticalBlockers:number; startedAt:string; completedAt:string|null; createdBy:string|null; createdAt:string; updatedAt:string; }
export type LeaveType="VACATION"|"ADMINISTRATIVE_LEAVE"|"UNPAID_LEAVE"|"MEDICAL_LEAVE"|"OTHER";
export interface LeaveRequest { id:string; employeeId:string; leaveType:LeaveType; startDate:string; endDate:string; requestedUnits:number; unit:"DAYS"|"HOURS"|"HALF_DAY"; status:"DRAFT"|"PENDING_MANAGER"|"PENDING_HR"|"APPROVED"|"REJECTED"|"CANCELLED"; approverId:string|null; submittedAt:string|null; approvedAt:string|null; reasonCategory:string|null; documentId:string|null; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface LeaveBalance { id:string; employeeId:string; policyId:string|null; period:string; accrued:number; used:number; adjusted:number; available:number; updatedAt:string; }
export interface MedicalLeaveRecord { id:string; employeeId:string; startDate:string; endDate:string; days:number; status:"RECEIVED"|"REVIEW"|"ACCEPTED"|"REJECTED"|"CLOSED"; issuerReference:string|null; documentId:string|null; receivedAt:string; createdAt:string; updatedAt:string; }
export interface PayrollPeriod { id:string; period:string; status:"OPEN"|"CALCULATING"|"REVIEW"|"APPROVED"|"PAID"|"REPORTED"|"CLOSED"; paymentDate:string|null; ruleVersionId:string|null; totals:Record<string,number>; createdAt:string; closedAt:string|null; updatedAt:string; }
export interface PayrollEmployeeResult { id:string; payrollPeriodId:string; employeeId:string; grossTotal:number; deductionTotal:number; employerContributionTotal:number; taxableTotal:number; netTotal:number; employerCost:number; currency:string; calculationSnapshot:Record<string,unknown>; status:string; createdAt:string; updatedAt:string; }
export interface LreExport { id:string; payrollPeriodId:string; schemaVersionId:string; status:"NOT_READY"|"READY"|"VALIDATION_ERROR"|"READY_TO_SUBMIT"|"SUBMITTED_EXTERNALLY"|"VALIDATING"|"DECLARED"|"RECTIFICATION_REQUIRED"|"RECTIFIED"; documentId:string|null; receiptDocumentId:string|null; sha256:string|null; validationErrors:string[]; externalReference:string|null; generatedAt:string|null; submittedAt:string|null; declaredAt:string|null; createdAt:string; updatedAt:string; }
export interface HrAssetAssignment { id:string; assetId:string; employeeId:string; assignedAt:string; conditionOut:string|null; evidenceDocumentId:string|null; returnedAt:string|null; conditionReturn:string|null; createdAt:string; updatedAt:string; }
export interface EmployeeGoal { id:string; employeeId:string; title:string; description:string|null; period:string; ownerId:string|null; status:"DRAFT"|"ACTIVE"|"AT_RISK"|"COMPLETED"|"CANCELLED"; progress:number; evidence:Record<string,unknown>; createdAt:string; updatedAt:string; }
export interface TrainingAssignment { id:string; courseId:string; employeeId:string; status:"ASSIGNED"|"IN_PROGRESS"|"COMPLETED"|"EXPIRED"; assignedAt:string; dueDate:string|null; completedAt:string|null; certificateDocumentId:string|null; createdAt:string; updatedAt:string; }
export interface HrEvent { id:string; employeeId:string|null; aggregateType:string; aggregateId:string; eventType:string; actorId:string|null; payload:Record<string,unknown>; occurredAt:string; }
export interface HrAttentionItem { id:string; type:"CONTRACT"|"DOCUMENT"|"ONBOARDING"|"OFFBOARDING"|"LEAVE"|"LRE"|"COMPLIANCE"|"ASSET"; title:string; reason:string; severity:"ATTENTION"|"AT_RISK"|"CRITICAL"; href:string; dueAt:string|null; }
export interface HrSummary { activeEmployees:number; hiresThisMonth:number; terminationsThisMonth:number; onboardingActive:number; vacationsUpcoming:number; absencesToday:number; contractsExpiring:number; annexesPendingSignature:number; documentsPending:number; requestsPending:number; lrePending:number; offboardingPending:number; }
export interface HrWorkspace { summary:HrSummary; attention:HrAttentionItem[]; employees:Employee[]; relationships:EmploymentRelationship[]; departments:HrDepartment[]; teams:HrTeam[]; positions:JobPosition[]; contracts:EmploymentContract[]; annexes:EmploymentAnnex[]; onboarding:OnboardingInstance[]; offboarding:OffboardingInstance[]; leave:LeaveRequest[]; medical:MedicalLeaveRecord[]; payroll:PayrollPeriod[]; lre:LreExport[]; assets:HrAssetAssignment[]; goals:EmployeeGoal[]; training:TrainingAssignment[]; activity:HrEvent[]; providers:{signature:string;laborAuthority:string;attendance:string;payrollSubmission:string}; generatedAt:string; }
export interface EmployeeDetail { employee:Employee; relationship:EmploymentRelationship|null; contracts:EmploymentContract[]; annexes:EmploymentAnnex[]; leave:LeaveRequest[]; balance:LeaveBalance|null; medical:MedicalLeaveRecord[]; onboarding:OnboardingInstance[]; offboarding:OffboardingInstance[]; assets:HrAssetAssignment[]; goals:EmployeeGoal[]; training:TrainingAssignment[]; documents:RelatedDocumentsSnapshot|null; activity:HrEvent[]; compensationVisible:boolean; compensation?:Array<Record<string,unknown>>; }

export type AuthenticatorAssuranceLevel="aal1"|"aal2";
export type SecuritySeverity="INFO"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
export type SecurityPostureStatus="HEALTHY"|"ATTENTION"|"AT_RISK"|"CRITICAL";
export interface SecurityIdentity { id:string; email:string; name:string; identityType:"INTERNAL_USER"|"CLIENT_USER"|"SERVICE_IDENTITY"; role:Role|null; active:boolean; mfaStatus:"ENROLLED"|"NOT_ENROLLED"|"UNKNOWN"; lastSignInAt:string|null; createdAt:string; }
export interface SecuritySession { id:string; userId:string; role:string|null; deviceId:string|null; browser:string|null; os:string|null; ipMasked:string|null; region:string|null; aal:AuthenticatorAssuranceLevel; status:"ACTIVE"|"REVOKED"|"EXPIRED"; createdAt:string; lastActivityAt:string; revokedAt:string|null; revokedBy:string|null; }
export interface SecurityDevice { id:string; userId:string; deviceId:string; deviceName:string|null; deviceType:string|null; browser:string|null; os:string|null; firstSeen:string; lastSeen:string; trustStatus:"NEW"|"TRUSTED"|"UNTRUSTED"|"BLOCKED"|"REVOKED"; corporateManaged:boolean|null; securityCompliant:boolean|null; }
export interface SecurityAccessRequest { id:string; requesterId:string; resourceType:string; resourceId:string; permissionCode:string; reason:string; requestedMinutes:number; status:"REQUESTED"|"UNDER_REVIEW"|"APPROVED"|"REJECTED"|"CANCELLED"; reviewedBy:string|null; reviewReason:string|null; createdAt:string; updatedAt:string; }
export interface SecurityAccessGrant { id:string; requestId:string; userId:string; resourceType:string; resourceId:string; permissionCode:string; startsAt:string; expiresAt:string; status:"ACTIVE"|"EXPIRING"|"EXPIRED"|"REVOKED"; grantedBy:string; revokedBy:string|null; revokedAt:string|null; createdAt:string; updatedAt:string; }
export interface SecurityVaultItem { id:string; name:string; secretType:string; provider:string; encryptedReference:string; clientId:string|null; projectId:string|null; environment:string|null; ownerId:string|null; classification:"RESTRICTED"|"CRITICAL"; rotationPolicyId:string|null; rotatedAt:string|null; expiresAt:string|null; status:"ACTIVE"|"ROTATION_DUE"|"EXPIRED"|"REVOKED"; createdAt:string; updatedAt:string; }
export interface SecurityVaultAccess { id:string; vaultItemId:string; actorUserId:string|null; action:"REQUEST"|"REVEAL"|"COPY"|"ROTATE"|"REVOKE"; reason:string|null; sessionId:string|null; result:"ALLOWED"|"DENIED"|"PROVIDER_UNAVAILABLE"; occurredAt:string; }
export interface SecurityEvent { id:string; eventType:string; severity:SecuritySeverity; actorUserId:string|null; sessionId:string|null; ipMasked:string|null; deviceId:string|null; resourceType:string|null; resourceId:string|null; description:string; metadataSafe:Record<string,unknown>; detectedAt:string; status:"OPEN"|"ACKNOWLEDGED"|"INVESTIGATING"|"FALSE_POSITIVE"|"ESCALATED"|"CLOSED"; acknowledgedBy:string|null; acknowledgedAt:string|null; }
export interface SecurityIncident { id:string; incidentNumber:string; title:string; description:string|null; incidentType:string; severity:"SEV4"|"SEV3"|"SEV2"|"SEV1"; status:"DETECTED"|"TRIAGE"|"CONFIRMED"|"CONTAINING"|"INVESTIGATING"|"ERADICATING"|"RECOVERING"|"MONITORING"|"RESOLVED"|"POSTMORTEM"|"CLOSED"; commanderId:string|null; privacyBreach:boolean; detectedAt:string; resolvedAt:string|null; closedAt:string|null; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface SecurityIncidentEvent { id:string; incidentId:string; eventType:string; description:string; actorId:string|null; evidenceDocumentId:string|null; occurredAt:string; }
export interface SecurityVulnerability { id:string; source:string; externalId:string|null; cve:string|null; cwe:string|null; title:string; description:string|null; severity:Exclude<SecuritySeverity,"INFO">; affectedComponent:string; status:"OPEN"|"TRIAGED"|"MITIGATING"|"FIX_READY"|"FIXED"|"VERIFIED"|"ACCEPTED_RISK"|"FALSE_POSITIVE"; ownerId:string|null; detectedAt:string; dueDate:string|null; fixedAt:string|null; verifiedAt:string|null; acceptedRiskExpiresAt:string|null; evidenceDocumentId:string|null; createdAt:string; updatedAt:string; }
export interface SecurityControl { id:string; controlCode:string; framework:string; title:string; description:string|null; ownerId:string|null; status:"NOT_IMPLEMENTED"|"IMPLEMENTED"|"VERIFIED"|"FAILED"|"EXCEPTION"; evidenceSummary:string|null; lastTestedAt:string|null; nextTestAt:string|null; createdAt:string; updatedAt:string; }
export interface SecurityScan { id:string; scanType:"SAST"|"SCA"|"SECRET_SCAN"|"AUTHORIZATION"|"RLS"|"DAST"|"PENTEST"|"RESTORE"; provider:string; status:"NOT_CONFIGURED"|"QUEUED"|"RUNNING"|"PASSED"|"FAILED"|"ERROR"; commitSha:string|null; startedAt:string|null; completedAt:string|null; criticalFindings:number; highFindings:number; reportDocumentId:string|null; createdAt:string; updatedAt:string; }
export interface DataAsset { id:string; module:string; system:string; tableName:string|null; fieldName:string|null; name:string; categoryCode:string; classification:DocumentClassification; purpose:string|null; retentionPolicyId:string|null; ownerId:string|null; processor:string|null; accessRoles:string[]; encryptedAtRest:boolean|null; location:string|null; status:"INVENTORIED"|"REVIEW_REQUIRED"|"RETIRED"; createdAt:string; updatedAt:string; }
export interface ProcessingActivity { id:string; name:string; purpose:string; dataSubjects:string[]; dataCategories:string[]; source:string|null; recipients:string[]; retention:string|null; securityMeasures:string[]; internationalTransfer:string|null; legalBasisMetadata:string|null; ownerId:string|null; status:"DRAFT"|"REVIEW"|"APPROVED"|"RETIRED"; createdAt:string; updatedAt:string; }
export interface DataSubjectRequest { id:string; requestNumber:string; requestType:"ACCESS"|"RECTIFICATION"|"DELETION"|"OPPOSITION"|"RESTRICTION"|"PORTABILITY"; subjectReference:string; status:"RECEIVED"|"IDENTITY_VERIFICATION"|"ASSESSMENT"|"DATA_DISCOVERY"|"REVIEW"|"FULFILLED"|"REJECTED_WITH_REASON"; identityVerifiedAt:string|null; dueAt:string|null; ownerId:string|null; decisionReason:string|null; legalHoldConflict:boolean; createdAt:string; updatedAt:string; }
export interface PrivacyImpactAssessment { id:string; name:string; trigger:string; purpose:string; scope:string; dataDescription:string; necessity:string|null; risk:string|null; impact:string|null; controls:string[]; residualRisk:string|null; ownerId:string|null; reviewerId:string|null; status:"DRAFT"|"REVIEW"|"APPROVED"|"REJECTED"; createdAt:string; updatedAt:string; }
export interface VendorSecurityRecord { id:string; vendorName:string; service:string; dataShared:boolean; dataCategories:string[]; purpose:string|null; region:string|null; subprocessorsKnown:boolean|null; securityDocsUrl:string|null; contractDocumentId:string|null; dpaStatus:"NOT_REQUIRED"|"PENDING"|"SIGNED"|"EXPIRED"|"UNKNOWN"; reviewDate:string|null; nextReviewDate:string|null; risk:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"|"NOT_ASSESSED"; status:"ACTIVE"|"UNDER_REVIEW"|"SUSPENDED"|"ENDED"; createdAt:string; updatedAt:string; }
export interface RecoveryTest { id:string; targetId:string|null; name:string; scope:string; backupReference:string|null; startedAt:string|null; completedAt:string|null; result:"PLANNED"|"RUNNING"|"PASSED"|"FAILED"|"PARTIAL"; actualRtoMinutes:number|null; dataValidation:string|null; evidenceDocumentId:string|null; createdAt:string; updatedAt:string; }
export interface SecurityGate { id:string; releaseReference:string; status:"PASS"|"PASS_WITH_EXCEPTION"|"FAIL"; evaluatedAt:string; evaluatedBy:string|null; blockers:Array<{code:string;severity:SecuritySeverity;reason:string;evidence:string|null}>; warnings:Array<{code:string;reason:string}>; evidenceSnapshot:Record<string,unknown>; createdAt:string; }
export interface SecurityPosture { status:SecurityPostureStatus; reasons:Array<{key:string;label:string;status:"HEALTHY"|"ATTENTION"|"AT_RISK"|"CRITICAL"|"UNKNOWN";explanation:string;href:string}>; evaluatedAt:string; }
export interface SecuritySummary { criticalEvents:number; highEvents:number; loginFailures:number; newDevices:number; mfaCoverage:number|null; privilegedAccounts:number; activePrivilegedSessions:number; accessRequests:number; vaultAccesses:number; rlsFindings:number; openVulnerabilities:number; exposedSecretFindings:number; openIncidents:number; backupStatus:"HEALTHY"|"ATTENTION"|"AT_RISK"|"CRITICAL"|"NOT_CONFIGURED"; restoreStatus:"VALIDATED"|"STALE"|"FAILED"|"NEVER_VALIDATED"; gateStatus:"PASS"|"PASS_WITH_EXCEPTION"|"FAIL"|"NOT_EVALUATED"; }
export interface SecurityWorkspace { summary:SecuritySummary; posture:SecurityPosture; identities:SecurityIdentity[]; sessions:SecuritySession[]; devices:SecurityDevice[]; accessRequests:SecurityAccessRequest[]; accessGrants:SecurityAccessGrant[]; accessReviews:Array<Record<string,unknown>>; vaultItems:SecurityVaultItem[]; vaultAccesses:SecurityVaultAccess[]; events:SecurityEvent[]; incidents:SecurityIncident[]; incidentEvents:SecurityIncidentEvent[]; vulnerabilities:SecurityVulnerability[]; controls:SecurityControl[]; scans:SecurityScan[]; dataAssets:DataAsset[]; processingActivities:ProcessingActivity[]; subjectRequests:DataSubjectRequest[]; dpias:PrivacyImpactAssessment[]; privacyBreaches:Array<Record<string,unknown>>; retentionPolicies:Array<Record<string,unknown>>; dataExports:Array<Record<string,unknown>>; vendors:VendorSecurityRecord[]; backupTargets:Array<Record<string,unknown>>; recoveryTests:RecoveryTest[]; disasterRecoveryPlans:Array<Record<string,unknown>>; threatModels:Array<Record<string,unknown>>; gates:SecurityGate[]; settings:Array<Record<string,unknown>>; roles:Array<{role:string;permissionCount:number;classification:"STANDARD"|"SENSITIVE"|"PRIVILEGED"|"SECURITY_CRITICAL"}>; permissions:Array<{code:string;description:string}>; providers:{vault:string;secretScan:string;sast:string;sca:string;dast:string;backup:string;waf:string;malware:string}; generatedAt:string; }

export * from "./finance.js";
export type ConfigurationHealthStatus="HEALTHY"|"ATTENTION"|"AT_RISK"|"CRITICAL";
export type ConfigurationClassification="PUBLIC"|"INTERNAL"|"CONFIDENTIAL"|"RESTRICTED"|"CRITICAL";
export interface ConfigurationEntry { id:string; namespace:string; key:string; value:unknown; valueType:"STRING"|"INTEGER"|"DECIMAL"|"BOOLEAN"|"ENUM"|"DURATION"|"JSON"|"SECRET_REFERENCE"; environment:"DEVELOPMENT"|"STAGING"|"PRODUCTION"; classification:ConfigurationClassification; version:number; effectiveFrom:string; description:string|null; schema:Record<string,unknown>; ownerDomain:string; approvalRequired:boolean; updatedBy:string|null; updatedAt:string; }
export interface ConfigurationHistoryItem { id:string; configurationId:string|null; namespace:string; key:string; action:string; beforeValue:unknown; afterValue:unknown; actorId:string|null; actorRole:string|null; reason:string; approvalId:string|null; version:number|null; occurredAt:string; }
export interface AutomationRule { id:string; name:string; description:string|null; eventType:string; conditions:Array<{field:string;operator:string;value:unknown}>; actions:Array<{type:string;config:Record<string,unknown>}>; priority:number; enabled:boolean; dryRun:boolean; environment:string; version:number; maxDepth:number; retryPolicy:{maxAttempts:number;backoffSeconds:number}; createdBy:string|null; updatedBy:string|null; createdAt:string; updatedAt:string; }
export interface AutomationRun { id:string; ruleId:string; eventId:string|null; correlationId:string; causationId:string|null; depth:number; matched:boolean; actions:Array<Record<string,unknown>>; result:"DRY_RUN"|"SUCCESS"|"FAILED"|"DEAD_LETTER"|"SKIPPED_LOOP"|"DUPLICATE"; durationMs:number; errorSafe:string|null; createdAt:string; }
export interface AlertRule { id:string; name:string; source:string; eventType:string; severityMin:"INFO"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; conditions:Array<Record<string,unknown>>; recipients:string[]; channels:string[]; quietHours:Record<string,unknown>; dedupWindowMinutes:number; escalationPolicyId:string|null; acknowledgeRequired:boolean; criticalOverride:boolean; enabled:boolean; createdAt:string; updatedAt:string; }
export interface SettingsIntegrationConnection { id:string; code:string; name:string; category:string; status:"NOT_CONFIGURED"|"CONFIGURED"|"CONNECTED"|"DEGRADED"|"ERROR"|"DISABLED"; environment:string; ownerDomain:string; configuration:Record<string,unknown>; secretReference:string|null; lastTestAt:string|null; lastSuccessAt:string|null; lastErrorSafe:string|null; lastLatencyMs:number|null; enabled:boolean; updatedAt:string; }
export interface OutgoingWebhook { id:string; name:string; url:string; events:string[]; secretReference:string|null; enabled:boolean; retryPolicy:{maxAttempts:number;backoffSeconds:number}; status:string; createdAt:string; updatedAt:string; }
export interface FeatureFlag { id:string; key:string; description:string; enabled:boolean; environment:string; scope:"GLOBAL"|"ROLE"|"TEAM"|"USER"|"CLIENT"|"ENVIRONMENT"; rollout:number; killSwitch:boolean; createdBy:string|null; createdAt:string; updatedAt:string; }
export interface SystemJob { id:string; code:string; name:string; ownerDomain:string; schedule:string|null; enabled:boolean; manualRunAllowed:boolean; status:"IDLE"|"RUNNING"|"SUCCESS"|"FAILED"|"DELAYED"|"DISABLED"; lastRunAt:string|null; nextRunAt:string|null; durationMs:number|null; lastErrorSafe:string|null; updatedAt:string; }
export interface SystemDiagnostic { id:string; service:string; status:"HEALTHY"|"DEGRADED"|"ERROR"|"NOT_CONFIGURED"; latencyMs:number|null; message:string; checkedAt:string; }
export interface SettingsWorkspace { summary:{health:ConfigurationHealthStatus;reasons:Array<{status:ConfigurationHealthStatus;label:string;detail:string;href:string}>;activeIntegrations:number;failedIntegrations:number;activeAutomations:number;failedAutomations:number;activeAlerts:number;failedJobs:number;featureFlags:number;pendingApprovals:number;incompleteConfigurations:number;failingWebhooks:number;recentCriticalChanges:number}; configuration:ConfigurationEntry[]; history:ConfigurationHistoryItem[]; automations:AutomationRule[]; automationRuns:AutomationRun[]; alerts:AlertRule[]; integrations:SettingsIntegrationConnection[]; webhooks:OutgoingWebhook[]; webhookDeliveries:Array<Record<string,unknown>>; features:FeatureFlag[]; workflows:Array<Record<string,unknown>>; approvals:Array<Record<string,unknown>>; jobs:SystemJob[]; diagnostics:SystemDiagnostic[]; numbering:Array<Record<string,unknown>>; calendars:Array<Record<string,unknown>>; dependencies:Array<{source:string;targets:string[];status:string}>; canonical:{departments:Array<Record<string,unknown>>;teams:Array<Record<string,unknown>>;roles:Array<Record<string,unknown>>;templates:Array<Record<string,unknown>>;supportSla:Array<Record<string,unknown>>;securityPosture:SecurityPosture|null}; generatedAt:string; }
