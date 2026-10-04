# Graph Report - CONTROL ZYTERON  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3503 nodes · 9937 edges · 157 communities (102 shown, 55 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 1078 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82a40792`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- Headers
- @nestjs/common
- OperationsActor
- Headers
- OperationsService
- OperationsRepository
- actorFromHeaders
- operations-workspace.tsx
- commercial.module.ts
- formatDate
- RenewalsRepository
- development.controller.ts
- client-domain-api.ts
- ContractsRepository
- support.service.ts
- packages_contracts_dist_index
- RequireRoles
- enterprise-shell.tsx
- support.module.ts
- ClientsRepository
- ClientServicesRepository
- SupportRepository
- ContactsRepository
- .publish
- hr.module.ts
- CommercialRepository
- Param
- .publish
- Get
- audits.controller.ts
- employees.service.ts
- useAccess
- audits.service.ts
- compilerOptions
- QuotesService
- ClientsController
- documents.service.ts
- hr/contracts.service.ts
- SupportTicketService
- 20260930120000_complete_client_domain.sql
- hr-workspace.tsx
- commercial-workspace.tsx
- actor
- DocumentsRepository
- .list
- documents-workspace.tsx
- DocumentService
- OpportunitiesService
- SalesService
- HrActor
- 20260930070000_client_360.sql
- module-page.tsx
- support-workspace.tsx
- client-360.tsx
- audits.repository.ts
- FollowUpsService
- HrRepository
- package.json
- renewal-center.tsx
- LeadsController
- Get
- documents.controller.ts
- DocumentSignatureService
- api/package.json
- date-time.ts
- crm.controller.ts
- CommercialController
- Zyteron Control
- contracts/package.json
- new-client-wizard.tsx
- 20261001080000_document_control_center.sql
- web/package.json
- control-dashboard 2.tsx
- 20261001060000_service_desk_support_center.sql
- client-provider-ports.ts
- DocumentReadService
- .create
- module-content.ts
- dependencies
- UsersController
- compilerOptions
- AuditPlanService
- dependencies
- commercial-pipeline.tsx
- scripts
- devDependencies
- scripts
- devDependencies
- ADR-002 — Renovaciones materializadas
- Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?
- Q: ¿Qué arquitectura y postura de seguridad exige el arranque?
- Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?
- Q: ¿Cómo conecta Client 360 con los dominios empresariales?
- Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?
- Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?
- Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?
- Q: ¿Por qué Zyteron Control necesita dos servicios en Render?
- Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?
- Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?
- Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?
- Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?
- nest-cli.json
- AuthController
- next-env.d.ts
- activity-feed.tsx
- AGENTS.md
- ClientContact
- Controller
- Get
- Module
- Body
- Controller
- Delete
- Get
- Headers
- Param
- Patch
- Post
- Query
- Controller
- Get
- Controller
- Get
- Controller
- Get
- ext_packages_contracts_dist_index_js
- Inject
- public.client_portal_users
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_client
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientcontact
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientevent
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clienthealthfactor
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clienthealthstatus
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientlistresponse
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientportalsettings
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientservice
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientstatuses
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_commercialrecord
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_createclientinput
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_createcommercialrecord
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_pipelinestage
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_pipelinestages
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_pipelinesummary
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_role
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_roles
- web_next_types_root_params_d
- web_next_types_routes_d
- web_src_app_globals

## God Nodes (most connected - your core abstractions)
1. `RequireRoles()` - 388 edges
2. `actorFromHeaders()` - 141 edges
3. `@nestjs/common` - 114 edges
4. `OperationsService` - 79 edges
5. `OperationsRepository` - 75 edges
6. `CommercialRepository` - 74 edges
7. `actor()` - 65 edges
8. `formatDate()` - 62 edges
9. `HrActor` - 60 edges
10. `useAccess()` - 57 edges

## Surprising Connections (you probably didn't know these)
- `GoalCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `HandoffCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `Attention()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/hr/hr-workspace.tsx → apps/web/src/lib/date-time.ts
- `Milestones()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/operations/operations-workspace.tsx → apps/web/src/lib/date-time.ts
- `ContactCard()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/contact-directory.tsx → apps/web/src/components/access-context.tsx

## Import Cycles
- None detected.

## Communities (157 total, 55 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.01
Nodes (224): AssignmentRecommendation, AuditAttentionItem, AuditCheckResult, AuditCheckStatus, auditCheckStatuses, AuditEvent, AuditEvidence, AuditFinding (+216 more)

### Community 1 - "Headers"
Cohesion: 0.05
Nodes (35): actor(), DocumentsController, DocumentTemplatesController, actor(), EmployeesController, EmploymentAnnexesController, EmploymentContractsController, header() (+27 more)

### Community 2 - "@nestjs/common"
Cohesion: 0.03
Nodes (79): AuthModule, Module, RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, ClientServicesModule, Module (+71 more)

### Community 3 - "OperationsActor"
Cohesion: 0.07
Nodes (11): optionalUuid(), required(), LeadsService, Injectable, DevelopmentManagementService, QualityService, ReleaseService, Injectable (+3 more)

### Community 4 - "Headers"
Cohesion: 0.09
Nodes (22): DeliverablesController, deliveryRoles, DeploymentsController, HeadersMap, managerRoles, MilestonesController, OperationsController, ProjectsController (+14 more)

### Community 5 - "OperationsService"
Cohesion: 0.06
Nodes (13): Delete, camel(), DevelopmentRepository, fromRow(), now(), snake(), toRow(), Injectable (+5 more)

### Community 6 - "OperationsRepository"
Cohesion: 0.06
Nodes (4): now(), OperationsRepository, relationName(), Injectable

### Community 7 - "actorFromHeaders"
Cohesion: 0.11
Nodes (16): BugsController, DevelopmentController, ProjectDevelopmentController, QaController, ReleasesController, RepositoriesController, TechnicalDebtController, Body (+8 more)

### Community 8 - "operations-workspace.tsx"
Cohesion: 0.05
Nodes (43): commercialRoles, managerRoles, operationsRoles, projectTransitions, taskTransitions, workTransitions, Command(), Deliverables() (+35 more)

### Community 9 - "commercial.module.ts"
Cohesion: 0.06
Nodes (46): ClientsModule, Module, CommercialModule, PageInput, pageQuery(), scopedPageQuery(), uuidPattern, roles (+38 more)

### Community 10 - "formatDate"
Cohesion: 0.06
Nodes (53): managers, page, percent(), technicalRoles, sections, DevelopmentProjectView(), label(), Assignments() (+45 more)

### Community 11 - "RenewalsRepository"
Cohesion: 0.07
Nodes (22): ClientRenewalsController, managers, readers, RenewalsController, Body, Controller, Get, Param (+14 more)

### Community 12 - "development.controller.ts"
Cohesion: 0.06
Nodes (22): Public(), DevelopmentWebhooksController, EnvironmentsController, HeaderMap, IntegrationsController, leadRoles, qaRoles, readRoles (+14 more)

### Community 13 - "client-domain-api.ts"
Cohesion: 0.06
Nodes (42): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode (+34 more)

### Community 14 - "ContractsRepository"
Cohesion: 0.08
Nodes (14): ClientContractsController, ContractsController, Body, Controller, Get, Param, Patch, Post (+6 more)

### Community 15 - "support.service.ts"
Cohesion: 0.05
Nodes (44): agents, header(), HeaderMap, managers, readers, DeferredMailSupportProvider, SupportChannelProvider, SupportCopilotProvider (+36 more)

### Community 16 - "packages_contracts_dist_index"
Cohesion: 0.08
Nodes (29): managers, readers, clientPermissions, roles, page(), CommercialService, Injectable, managers (+21 more)

### Community 17 - "RequireRoles"
Cohesion: 0.18
Nodes (11): RequireRoles(), actor(), ClientSupportController, SupportController, SupportKnowledgeController, Body, Controller, Headers (+3 more)

### Community 18 - "enterprise-shell.tsx"
Cohesion: 0.06
Nodes (32): apps_web_src_app_globals, metadata, AccessContext, AccessContextValue, PermissionGate(), EmptyState(), NotificationCenter(), EnterpriseShell() (+24 more)

### Community 19 - "support.module.ts"
Cohesion: 0.06
Nodes (38): AuditsModule, Module, ClientEventsService, Injectable, ClientDomainHealthSignals, ClientHealthService, Injectable, clientDomainModules (+30 more)

### Community 20 - "ClientsRepository"
Cohesion: 0.08
Nodes (6): eventService(), parsePagination(), ClientsRepository, Injectable, ClientsService, Injectable

### Community 21 - "ClientServicesRepository"
Cohesion: 0.09
Nodes (14): ClientServicesController, Body, Controller, Get, Param, Patch, Post, Query (+6 more)

### Community 22 - "SupportRepository"
Cohesion: 0.08
Nodes (16): SupportInboundMessage, camel(), Filters, fromRow(), now(), relation(), Row, selectFor() (+8 more)

### Community 23 - "ContactsRepository"
Cohesion: 0.09
Nodes (18): ContactsController, managers, readers, Body, Controller, Get, Param, Patch (+10 more)

### Community 24 - ".publish"
Cohesion: 0.10
Nodes (11): date(), hr(), LeaveService, MedicalLeaveService, now(), OffboardingService, OnboardingService, required() (+3 more)

### Community 25 - "hr.module.ts"
Cohesion: 0.09
Nodes (25): HrModule, Module, AttendanceProvider, DeferredAttendanceProvider, DeferredPayrollSubmissionProvider, ExternalLaborAuthorityProvider, HrDocumentRenderer, LaborAuthorityProvider (+17 more)

### Community 26 - "CommercialRepository"
Cohesion: 0.08
Nodes (3): CommercialRepository, now(), Injectable

### Community 27 - "Param"
Cohesion: 0.18
Nodes (7): AuditsController, FindingsController, Body, Headers, Param, Patch, Post

### Community 28 - ".publish"
Cohesion: 0.13
Nodes (7): AuditExecutionService, AuditFindingService, date(), now(), required(), Injectable, uuid()

### Community 29 - "Get"
Cohesion: 0.10
Nodes (6): SupportRelationsController, Get, Query, SupportCatalogService, supportPage(), SupportReadService

### Community 30 - "audits.controller.ts"
Cohesion: 0.08
Nodes (15): AuditEvidenceController, AuditReportsController, AuditTemplatesController, AuditTemplateVersionsController, executeRoles, HeaderMap, managerRoles, ProjectAuditsController (+7 more)

### Community 31 - "employees.service.ts"
Cohesion: 0.10
Nodes (18): optionalUuid(), validateCreateClient(), isValidChileanRut(), normalizeRut(), date(), EmployeeAccessService, EmployeesService, executiveRoles (+10 more)

### Community 32 - "useAccess"
Cohesion: 0.08
Nodes (24): apps_web_src_app_audits, useAccess(), AuditDetailView(), AuditsView(), AuditWorkspace(), CommandCenter(), EvidenceView(), FindingsView() (+16 more)

### Community 33 - "audits.service.ts"
Cohesion: 0.09
Nodes (23): AuditAutomationProvider, AuditReportRenderer, DeferredPerformanceAuditProvider, PerformanceAuditProvider, RenderedAuditReport, reservedHost(), SafeAutomationResult, SafeHttpAuditProvider (+15 more)

### Community 34 - "compilerOptions"
Cohesion: 0.06
Nodes (33): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, rootDir, strictPropertyInitialization (+25 more)

### Community 36 - "ClientsController"
Cohesion: 0.15
Nodes (8): ClientsController, Body, Controller, Get, Param, Patch, Post, Query

### Community 37 - "documents.service.ts"
Cohesion: 0.12
Nodes (20): DeferredFileSecurityScanner, DeferredOcrProvider, DeferredSignatureProvider, DeferredTextExtractor, DocumentOcrProvider, DocumentRenderingService, DocumentTextExtractor, EnterpriseSignatureProvider (+12 more)

### Community 38 - "hr/contracts.service.ts"
Cohesion: 0.12
Nodes (12): addDays(), date(), EmploymentAnnexesService, EmploymentContractsService, hr(), now(), required(), Injectable (+4 more)

### Community 39 - "SupportTicketService"
Cohesion: 0.15
Nodes (7): now(), SupportSlaService, SupportTicketService, activeMinute(), parts(), SupportSlaEngine, Injectable

### Community 40 - "20260930120000_complete_client_domain.sql"
Cohesion: 0.09
Nodes (26): public.client_assignments, public.client_services, public.clients, public.sync_client_domain_renewal, public.sync_renewal_notification_schedule, client_contracts_sync_renewal, client_domain_audit_client_idx, client_domain_notifications_user_idx (+18 more)

### Community 41 - "hr-workspace.tsx"
Cohesion: 0.11
Nodes (21): apps_web_src_app_hr, Attention(), CommandCenter(), DocumentsArea(), EmployeeRecord(), HrWorkspace(), act(), label() (+13 more)

### Community 42 - "commercial-workspace.tsx"
Cohesion: 0.09
Nodes (18): sections, sections, CatalogItem, Command(), CommercialWorkspace(), CommissionCenter(), emptySummary, FollowUpCenter() (+10 more)

### Community 43 - "actor"
Cohesion: 0.22
Nodes (10): actor(), CommercialQuotesController, Body, Controller, Get, Headers, Param, Patch (+2 more)

### Community 44 - "DocumentsRepository"
Cohesion: 0.13
Nodes (9): camel(), DocumentsRepository, Filters, fromRow(), now(), Row, snake(), toRow() (+1 more)

### Community 45 - ".list"
Cohesion: 0.11
Nodes (7): OrganizationService, HrReadService, now(), Inject, Injectable, WorkforceOperationsService, Optional

### Community 46 - "documents-workspace.tsx"
Cohesion: 0.11
Nodes (21): apps_web_src_app_documents, Command(), DocumentRecord(), DocumentsWorkspace(), act(), domainLink, Explorer(), fileBase64() (+13 more)

### Community 47 - "DocumentService"
Cohesion: 0.15
Nodes (8): Optional, Optional, compatible(), detectMime(), DocumentService, now(), required(), uuid()

### Community 48 - "OpportunitiesService"
Cohesion: 0.15
Nodes (11): OpportunitiesController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 49 - "SalesService"
Cohesion: 0.13
Nodes (9): CommissionsController, HandoffsController, SalesController, SalesGoalsController, Controller, Get, Query, SalesService (+1 more)

### Community 50 - "HrActor"
Cohesion: 0.20
Nodes (8): HrActor, hr(), LreService, now(), PayrollService, period(), Injectable, uuid()

### Community 51 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 52 - "module-page.tsx"
Cohesion: 0.11
Nodes (5): RoleGuard(), DataTable(), FilterBar(), StatusBadge(), ModulePage()

### Community 53 - "support-workspace.tsx"
Cohesion: 0.12
Nodes (16): apps_web_src_app_support, active(), Command(), CreateTicket(), InboxView(), KnowledgeView(), label(), labels (+8 more)

### Community 54 - "client-360.tsx"
Cohesion: 0.10
Nodes (16): Client360(), ClientContracts(), ClientOperations(), ClientRenewals(), ClientTab, Commercial(), Contacts(), formatMoney() (+8 more)

### Community 55 - "audits.repository.ts"
Cohesion: 0.19
Nodes (14): AuditPage, AuditsRepository, camel(), excluded, Filters, fromRow(), relationValue(), Row (+6 more)

### Community 56 - "FollowUpsService"
Cohesion: 0.14
Nodes (11): FollowUpsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 57 - "HrRepository"
Cohesion: 0.16
Nodes (13): required(), uuid(), camel(), Filters, fromRow(), HrPage, HrRepository, now() (+5 more)

### Community 58 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 59 - "renewal-center.tsx"
Cohesion: 0.15
Nodes (17): countdown(), empty, groupItems(), label(), money(), RenewalActions(), RenewalCalendar(), RenewalCard() (+9 more)

### Community 60 - "LeadsController"
Cohesion: 0.22
Nodes (9): LeadsController, Body, Controller, Get, Headers, Param, Patch, Post (+1 more)

### Community 63 - "documents.controller.ts"
Cohesion: 0.14
Nodes (11): ClientDocumentsController, DocumentReviewsController, DocumentShareLinksController, header(), HeaderMap, readers, SharedDocumentsController, SignatureRequestsController (+3 more)

### Community 64 - "DocumentSignatureService"
Cohesion: 0.18
Nodes (5): DocumentAccessService, DocumentSharingService, DocumentSignatureService, DocumentWorkflowService, Injectable

### Community 65 - "api/package.json"
Cohesion: 0.13
Nodes (14): @types/node, vitest, name, private, type, version, AppModule, Module (+6 more)

### Community 66 - "date-time.ts"
Cohesion: 0.18
Nodes (10): manager, Services(), save(), dateFormatter, formatTime(), timeFormatter, toIsoDate(), ref_node_fs (+2 more)

### Community 67 - "crm.controller.ts"
Cohesion: 0.18
Nodes (9): CrmController, Body, Controller, Get, Post, CrmService, Injectable, packages_contracts_dist_index_createcommercialrecord (+1 more)

### Community 68 - "CommercialController"
Cohesion: 0.17
Nodes (4): CommercialController, Controller, Get, Query

### Community 69 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 70 - "contracts/package.json"
Cohesion: 0.14
Nodes (13): typescript, devDependencies, typescript, exports, main, name, private, scripts (+5 more)

### Community 71 - "new-client-wizard.tsx"
Cohesion: 0.22
Nodes (9): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, clientsApi, isValidRut() (+1 more)

### Community 72 - "20261001080000_document_control_center.sql"
Cohesion: 0.14
Nodes (6): public.document_event_outbox, public.prevent_document_version_mutation, document_events_outbox, document_versions_immutable, private.document_portal_client_id(), public.client_portal_users

### Community 73 - "web/package.json"
Cohesion: 0.15
Nodes (11): @supabase/supabase-js, @zyteron/contracts, nextConfig, vitest, name, private, version, @next/env (+3 more)

### Community 74 - "control-dashboard 2.tsx"
Cohesion: 0.18
Nodes (8): fallbackRecords, money, stageLabels, stages, ControlDashboard(), money, packages_contracts_dist_index_commercialrecord, packages_contracts_dist_index_pipelinesummary

### Community 75 - "20261001060000_service_desk_support_center.sql"
Cohesion: 0.15
Nodes (6): public.knowledge_version_immutable, public.support_event_to_outbox, knowledge_version_immutable, private.support_portal_client_id(), public.client_portal_users, support_event_outbox

### Community 77 - "client-provider-ports.ts"
Cohesion: 0.18
Nodes (4): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider

### Community 78 - "DocumentReadService"
Cohesion: 0.18
Nodes (3): DocumentReadService, DocumentTemplateService, Inject

### Community 79 - ".create"
Cohesion: 0.27
Nodes (4): Body, Headers, Param, Post

### Community 80 - "module-content.ts"
Cohesion: 0.27
Nodes (7): groupForPath(), getModuleDescriptor(), groupContent, ModuleDescriptor, enterpriseNavigation, NavigationGroup, NavigationItem

### Community 81 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+1 more)

### Community 82 - "UsersController"
Cohesion: 0.22
Nodes (6): Controller, Get, Injectable, RequireRoles, UsersController, UsersDirectoryService

### Community 85 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, noUncheckedIndexedAccess, skipLibCheck, strict, target

### Community 87 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js, @zyteron/contracts

### Community 88 - "commercial-pipeline.tsx"
Cohesion: 0.29
Nodes (5): CommercialPipeline(), money, stages, PageHeader(), packages_contracts_dist_index_pipelinestage

### Community 89 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 90 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @types/node, @types/react, @types/react-dom, typescript, vitest

### Community 91 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 92 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, @nestjs/cli, @types/node, typescript, vitest

### Community 94 - "ADR-002 — Renovaciones materializadas"
Cohesion: 0.40
Nodes (4): ADR-002 — Renovaciones materializadas, Decisión, Integridad, Motivo

### Community 95 - "Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?, Source Nodes

### Community 96 - "Q: ¿Qué arquitectura y postura de seguridad exige el arranque?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué arquitectura y postura de seguridad exige el arranque?, Source Nodes

### Community 97 - "Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?, Source Nodes

### Community 98 - "Q: ¿Cómo conecta Client 360 con los dominios empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo conecta Client 360 con los dominios empresariales?, Source Nodes

### Community 99 - "Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?, Source Nodes

### Community 100 - "Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?, Source Nodes

### Community 101 - "Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?, Source Nodes

### Community 102 - "Q: ¿Por qué Zyteron Control necesita dos servicios en Render?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Zyteron Control necesita dos servicios en Render?, Source Nodes

### Community 103 - "Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?, Source Nodes

### Community 104 - "Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?, Source Nodes

### Community 105 - "Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?, Source Nodes

### Community 106 - "Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?, Source Nodes

### Community 107 - "nest-cli.json"
Cohesion: 0.50
Nodes (3): collection, $schema, sourceRoot

### Community 108 - "AuthController"
Cohesion: 0.50
Nodes (3): AuthController, Controller, Get

### Community 109 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, apps_web_next_types_root_params_d, apps_web_next_types_routes_d

## Knowledge Gaps
- **543 isolated node(s):** `AssignmentRecommendation`, `AuditAttentionItem`, `AuditCheckResult`, `AuditCheckStatus`, `AuditEvent` (+538 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1047 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `Headers`, `@nestjs/common`, `Headers`, `OperationsService`, `actorFromHeaders`, `commercial.module.ts`, `RenewalsRepository`, `development.controller.ts`, `ContractsRepository`, `support.service.ts`, `packages_contracts_dist_index`, `support.module.ts`, `ClientServicesRepository`, `ContactsRepository`, `Param`, `.publish`, `Get`, `audits.controller.ts`, `ClientsController`, `actor`, `OpportunitiesService`, `SalesService`, `FollowUpsService`, `LeadsController`, `Get`, `documents.controller.ts`, `crm.controller.ts`, `CommercialController`, `.create`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `Headers`, `Headers`, `operations-workspace.tsx`, `commercial.module.ts`, `formatDate`, `RenewalsRepository`, `development.controller.ts`, `support.service.ts`, `packages_contracts_dist_index`, `support.module.ts`, `SupportRepository`, `ContactsRepository`, `hr.module.ts`, `audits.controller.ts`, `employees.service.ts`, `audits.service.ts`, `documents.service.ts`, `hr/contracts.service.ts`, `DocumentsRepository`, `audits.repository.ts`, `HrRepository`, `documents.controller.ts`, `api/package.json`, `date-time.ts`, `crm.controller.ts`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `CommercialRepository` connect `CommercialRepository` to `QuotesService`, `CommercialController`, `OperationsActor`, `commercial.module.ts`, `packages_contracts_dist_index`, `SalesService`, `OpportunitiesService`, `FollowUpsService`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `AssignmentRecommendation`, `AuditAttentionItem`, `AuditCheckResult` to the rest of the system?**
  _543 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.008888888888888889 - nodes in this community are weakly interconnected._
- **Should `Headers` be split into smaller, more focused modules?**
  _Cohesion score 0.0542421068382463 - nodes in this community are weakly interconnected._
- **Should `@nestjs/common` be split into smaller, more focused modules?**
  _Cohesion score 0.03073463268365817 - nodes in this community are weakly interconnected._