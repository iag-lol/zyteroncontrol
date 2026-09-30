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
  createdAt: string;
}

export interface ClientService {
  id: string;
  clientId: string;
  serviceId: string;
  serviceName: string;
  contractId: string | null;
  startDate: string;
  renewalDate: string | null;
  billingFrequency: string | null;
  price: number | null;
  currency: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
  responsibleUserId: string | null;
  sla: string | null;
  notes: string | null;
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
  primaryContact?: Omit<ClientContact, "id" | "clientId" | "createdAt">;
  initialServices?: Array<Omit<ClientService, "id" | "clientId">>;
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
