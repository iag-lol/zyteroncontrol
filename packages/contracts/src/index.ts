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
  "JEFE_DESARROLLO",
  "EJECUTIVA_VENTAS",
  "PROGRAMADOR",
  "RRHH",
  "FINANZAS",
  "COMERCIAL",
  "DESARROLLO",
  "OPERACIONES",
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
