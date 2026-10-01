# Graph Report - CONTROL ZYTERON  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3092 nodes · 8471 edges · 141 communities (89 shown, 52 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 913 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de5a98e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- @nestjs/common
- CommercialRepository
- ClientsRepository
- actor
- actorFromHeaders
- documents.service.ts
- operations-workspace.tsx
- RequireRoles
- useAccess
- support.service.ts
- client-domain-api.ts
- packages_contracts_dist_index
- development.controller.ts
- ContractsRepository
- development-workspace.tsx
- OperationsRepository
- enterprise-shell.tsx
- OperationsService
- RenewalsRepository
- SupportController
- server-supabase.ts
- audits.module.ts
- ClientServicesRepository
- RequireRoles
- SupportRepository
- client-360.tsx
- SalesService
- ContactsRepository
- OperationsActor
- SupportTicketService
- DocumentService
- GitHubSourceControlProvider
- compilerOptions
- Headers
- documents-workspace.tsx
- 20260930120000_complete_client_domain.sql
- Get
- commercial-workspace.tsx
- DocumentsRepository
- .list
- OpportunitiesService
- 20260930070000_client_360.sql
- .publish
- DevelopmentReadService
- module-page.tsx
- support-workspace.tsx
- DevelopmentRepository
- audits.repository.ts
- contracts.service.ts
- pageBounds
- package.json
- audits.service.ts
- api/package.json
- crm.controller.ts
- audits.controller.ts
- Zyteron Control
- contracts/package.json
- new-client-wizard.tsx
- 20261001080000_document_control_center.sql
- web/package.json
- control-dashboard 2.tsx
- 20261001060000_service_desk_support_center.sql
- AuditExecutionService
- audits.test.ts
- client-hub.tsx
- now
- DocumentTemplateService
- dependencies
- compilerOptions
- UsersController
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
- ext_packages_contracts_dist_index_js
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
1. `RequireRoles()` - 390 edges
2. `actorFromHeaders()` - 141 edges
3. `@nestjs/common` - 105 edges
4. `OperationsService` - 79 edges
5. `OperationsRepository` - 75 edges
6. `CommercialRepository` - 74 edges
7. `useAccess()` - 55 edges
8. `OperationsActor` - 54 edges
9. `formatDate()` - 54 edges
10. `required()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `ContactCard()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/contact-directory.tsx → apps/web/src/components/access-context.tsx
- `GoalCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `HandoffCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `Milestones()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/operations/operations-workspace.tsx → apps/web/src/lib/date-time.ts
- `SupportActor` --inherits--> `OperationsActor`  [EXTRACTED]
  apps/api/src/support/support.service.ts → apps/api/src/operations/operations.service.ts

## Import Cycles
- None detected.

## Communities (141 total, 52 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.01
Nodes (195): AssignmentRecommendation, AuditAttentionItem, AuditCheckResult, AuditCheckStatus, auditCheckStatuses, AuditEvent, AuditEvidence, AuditFinding (+187 more)

### Community 1 - "@nestjs/common"
Cohesion: 0.03
Nodes (84): AuthController, AuthModule, Controller, Get, Module, Public(), CommercialModule, emptyDomain() (+76 more)

### Community 2 - "CommercialRepository"
Cohesion: 0.05
Nodes (9): CommercialRepository, now(), Injectable, FollowUpsService, Injectable, LeadsService, Injectable, QuotesService (+1 more)

### Community 3 - "ClientsRepository"
Cohesion: 0.05
Nodes (18): ClientsController, Body, Controller, Get, Param, Patch, Post, Query (+10 more)

### Community 4 - "actor"
Cohesion: 0.06
Nodes (37): actor(), FollowUpsController, Body, Controller, Get, Headers, Param, Patch (+29 more)

### Community 5 - "actorFromHeaders"
Cohesion: 0.10
Nodes (23): DeliverablesController, deliveryRoles, DeploymentsController, HeadersMap, managerRoles, MilestonesController, OperationsController, ProjectsController (+15 more)

### Community 6 - "documents.service.ts"
Cohesion: 0.06
Nodes (40): ClientDocumentsController, DocumentReviewsController, DocumentShareLinksController, header(), HeaderMap, readers, SharedDocumentsController, SignatureRequestsController (+32 more)

### Community 7 - "operations-workspace.tsx"
Cohesion: 0.05
Nodes (43): commercialRoles, managerRoles, operationsRoles, projectTransitions, taskTransitions, workTransitions, Command(), Deliverables() (+35 more)

### Community 8 - "RequireRoles"
Cohesion: 0.12
Nodes (15): AuditReportsController, AuditsController, AuditTemplatesController, AuditTemplateVersionsController, FindingsController, ProjectAuditsController, Body, Controller (+7 more)

### Community 9 - "useAccess"
Cohesion: 0.05
Nodes (42): apps_web_src_app_audits, useAccess(), AuditDetailView(), AuditsView(), AuditWorkspace(), CommandCenter(), EvidenceView(), FindingsView() (+34 more)

### Community 10 - "support.service.ts"
Cohesion: 0.06
Nodes (46): agents, header(), HeaderMap, managers, readers, DeferredMailSupportProvider, SupportChannelProvider, SupportCopilotProvider (+38 more)

### Community 11 - "client-domain-api.ts"
Cohesion: 0.06
Nodes (46): ContactCard(), ContactDirectory(), emptySummary, groupItems(), types, ContractCenter(), ContractDetail(), upload() (+38 more)

### Community 12 - "packages_contracts_dist_index"
Cohesion: 0.08
Nodes (39): roles, PageInput, pageQuery(), scopedPageQuery(), uuidPattern, roles, readers, MailMessage (+31 more)

### Community 13 - "development.controller.ts"
Cohesion: 0.08
Nodes (21): BugsController, DevelopmentWebhooksController, EnvironmentsController, HeaderMap, IntegrationsController, leadRoles, ProjectDevelopmentController, QaController (+13 more)

### Community 14 - "ContractsRepository"
Cohesion: 0.08
Nodes (14): ClientContractsController, ContractsController, Body, Controller, Get, Param, Patch, Post (+6 more)

### Community 15 - "development-workspace.tsx"
Cohesion: 0.07
Nodes (48): managers, page, percent(), technicalRoles, sections, Assignments(), Bugs(), Command() (+40 more)

### Community 16 - "OperationsRepository"
Cohesion: 0.07
Nodes (4): now(), OperationsRepository, relationName(), Injectable

### Community 17 - "enterprise-shell.tsx"
Cohesion: 0.06
Nodes (34): apps_web_src_app_globals, metadata, AccessContext, AccessContextValue, PermissionGate(), RoleGuard(), DataTable(), EmptyState() (+26 more)

### Community 18 - "OperationsService"
Cohesion: 0.10
Nodes (6): optionalUuid(), required(), uuid(), asNumber(), OperationsService, Injectable

### Community 19 - "RenewalsRepository"
Cohesion: 0.08
Nodes (16): ClientRenewalsController, managers, readers, RenewalsController, Body, Controller, Get, Param (+8 more)

### Community 20 - "SupportController"
Cohesion: 0.16
Nodes (10): actor(), ClientSupportController, SupportController, SupportKnowledgeController, Body, Controller, Headers, Param (+2 more)

### Community 21 - "server-supabase.ts"
Cohesion: 0.06
Nodes (32): RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, managers, readers, ClientServicesModule, Module (+24 more)

### Community 22 - "audits.module.ts"
Cohesion: 0.07
Nodes (35): AuditsModule, Module, eventService(), ClientEventsService, Injectable, ClientDomainHealthSignals, ClientHealthService, Injectable (+27 more)

### Community 23 - "ClientServicesRepository"
Cohesion: 0.09
Nodes (14): ClientServicesController, Body, Controller, Get, Param, Patch, Post, Query (+6 more)

### Community 24 - "RequireRoles"
Cohesion: 0.19
Nodes (11): actor(), DocumentsController, Body, Delete, Get, Headers, Param, Patch (+3 more)

### Community 25 - "SupportRepository"
Cohesion: 0.09
Nodes (15): SupportInboundMessage, camel(), Filters, fromRow(), now(), relation(), Row, selectFor() (+7 more)

### Community 26 - "client-360.tsx"
Cohesion: 0.07
Nodes (30): ClientPatch, InitialContact, InitialService, Client360(), ClientContracts(), ClientOperations(), ClientRenewals(), ClientTab (+22 more)

### Community 27 - "SalesService"
Cohesion: 0.08
Nodes (13): CommissionsController, HandoffsController, SalesController, SalesGoalsController, Body, Controller, Get, Headers (+5 more)

### Community 28 - "ContactsRepository"
Cohesion: 0.10
Nodes (14): ContactsController, Body, Controller, Get, Param, Patch, Post, Query (+6 more)

### Community 29 - "OperationsActor"
Cohesion: 0.12
Nodes (7): DevelopmentManagementService, IntegrationService, QualityService, ReleaseService, Injectable, manager, OperationsActor

### Community 30 - "SupportTicketService"
Cohesion: 0.11
Nodes (5): now(), required(), SupportKnowledgeService, SupportTicketService, uuid()

### Community 31 - "DocumentService"
Cohesion: 0.14
Nodes (5): Optional, DocumentService, now(), required(), uuid()

### Community 32 - "GitHubSourceControlProvider"
Cohesion: 0.10
Nodes (8): CIProvider, DeploymentProvider, GitHubActionsProvider, GitHubSourceControlProvider, RenderDeploymentProvider, SourceControlProvider, Injectable, unavailable()

### Community 33 - "compilerOptions"
Cohesion: 0.06
Nodes (33): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, rootDir, strictPropertyInitialization (+25 more)

### Community 34 - "Headers"
Cohesion: 0.15
Nodes (5): DevelopmentController, RepositoriesController, Get, Headers, Query

### Community 35 - "documents-workspace.tsx"
Cohesion: 0.10
Nodes (24): apps_web_src_app_documents, Command(), DocumentRecord(), DocumentsWorkspace(), act(), domainLink, Explorer(), fileBase64() (+16 more)

### Community 36 - "20260930120000_complete_client_domain.sql"
Cohesion: 0.09
Nodes (26): public.client_assignments, public.client_services, public.clients, public.sync_client_domain_renewal, public.sync_renewal_notification_schedule, client_contracts_sync_renewal, client_domain_audit_client_idx, client_domain_notifications_user_idx (+18 more)

### Community 37 - "Get"
Cohesion: 0.10
Nodes (6): SupportRelationsController, Get, Query, SupportPage, supportPage(), SupportReadService

### Community 38 - "commercial-workspace.tsx"
Cohesion: 0.09
Nodes (17): sections, sections, CatalogItem, Command(), CommercialWorkspace(), CommissionCenter(), emptySummary, GoalCenter() (+9 more)

### Community 39 - "DocumentsRepository"
Cohesion: 0.14
Nodes (9): camel(), DocumentsRepository, Filters, fromRow(), now(), Row, snake(), toRow() (+1 more)

### Community 40 - ".list"
Cohesion: 0.12
Nodes (6): AuditEvidenceController, AuditEvidenceService, AuditReadService, AuditReportService, Injectable, Optional

### Community 41 - "OpportunitiesService"
Cohesion: 0.11
Nodes (8): CommercialController, Controller, Get, Query, CommercialService, Injectable, OpportunitiesService, Injectable

### Community 42 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 43 - ".publish"
Cohesion: 0.21
Nodes (4): AuditFindingService, date(), required(), uuid()

### Community 45 - "module-page.tsx"
Cohesion: 0.11
Nodes (3): FilterBar(), StatusBadge(), ModulePage()

### Community 46 - "support-workspace.tsx"
Cohesion: 0.13
Nodes (15): apps_web_src_app_support, active(), Command(), CreateTicket(), InboxView(), label(), labels, QueuesView() (+7 more)

### Community 47 - "DevelopmentRepository"
Cohesion: 0.15
Nodes (10): camel(), DevelopmentRepository, Filter, fromRow(), now(), projectTables, Row, snake() (+2 more)

### Community 48 - "audits.repository.ts"
Cohesion: 0.19
Nodes (14): AuditPage, AuditsRepository, camel(), excluded, Filters, fromRow(), relationValue(), Row (+6 more)

### Community 49 - "contracts.service.ts"
Cohesion: 0.11
Nodes (12): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider, managers, readers, validateContract(), ContractsModule (+4 more)

### Community 50 - "pageBounds"
Cohesion: 0.20
Nodes (4): page(), cleanSearch(), pageBounds(), page()

### Community 51 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 52 - "audits.service.ts"
Cohesion: 0.12
Nodes (17): AuditAutomationProvider, AuditReportRenderer, DeferredPerformanceAuditProvider, PerformanceAuditProvider, RenderedAuditReport, reservedHost(), SafeAutomationResult, SafeHttpAuditProvider (+9 more)

### Community 54 - "api/package.json"
Cohesion: 0.13
Nodes (14): @types/node, vitest, name, private, type, version, AppModule, Module (+6 more)

### Community 55 - "crm.controller.ts"
Cohesion: 0.18
Nodes (9): CrmController, Body, Controller, Get, Post, CrmService, Injectable, packages_contracts_dist_index_createcommercialrecord (+1 more)

### Community 56 - "audits.controller.ts"
Cohesion: 0.14
Nodes (7): executeRoles, HeaderMap, managerRoles, readRoles, AuditCatalogService, apps_api_src_audits_audits_service_auditpage, pageInput()

### Community 57 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 58 - "contracts/package.json"
Cohesion: 0.14
Nodes (13): typescript, devDependencies, typescript, exports, main, name, private, scripts (+5 more)

### Community 59 - "new-client-wizard.tsx"
Cohesion: 0.22
Nodes (9): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, clientsApi, isValidRut() (+1 more)

### Community 60 - "20261001080000_document_control_center.sql"
Cohesion: 0.14
Nodes (6): public.document_event_outbox, public.prevent_document_version_mutation, document_events_outbox, document_versions_immutable, private.document_portal_client_id(), public.client_portal_users

### Community 61 - "web/package.json"
Cohesion: 0.15
Nodes (11): @supabase/supabase-js, @zyteron/contracts, nextConfig, vitest, name, private, version, @next/env (+3 more)

### Community 63 - "control-dashboard 2.tsx"
Cohesion: 0.18
Nodes (8): fallbackRecords, money, stageLabels, stages, ControlDashboard(), money, packages_contracts_dist_index_commercialrecord, packages_contracts_dist_index_pipelinesummary

### Community 64 - "20261001060000_service_desk_support_center.sql"
Cohesion: 0.15
Nodes (6): public.knowledge_version_immutable, public.support_event_to_outbox, knowledge_version_immutable, private.support_portal_client_id(), public.client_portal_users, support_event_outbox

### Community 66 - "audits.test.ts"
Cohesion: 0.29
Nodes (5): manager, manager, ref_node_fs, ref_node_path, ref_vitest

### Community 67 - "client-hub.tsx"
Cohesion: 0.21
Nodes (8): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode

### Community 70 - "DocumentTemplateService"
Cohesion: 0.20
Nodes (3): DocumentTemplatesController, DocumentTemplateService, Inject

### Community 71 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+1 more)

### Community 73 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, noUncheckedIndexedAccess, skipLibCheck, strict, target

### Community 74 - "UsersController"
Cohesion: 0.25
Nodes (5): Controller, Get, Injectable, UsersController, UsersDirectoryService

### Community 75 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js, @zyteron/contracts

### Community 76 - "commercial-pipeline.tsx"
Cohesion: 0.29
Nodes (5): CommercialPipeline(), money, stages, PageHeader(), packages_contracts_dist_index_pipelinestage

### Community 77 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 78 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @types/node, @types/react, @types/react-dom, typescript, vitest

### Community 79 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 80 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, @nestjs/cli, @types/node, typescript, vitest

### Community 82 - "ADR-002 — Renovaciones materializadas"
Cohesion: 0.40
Nodes (4): ADR-002 — Renovaciones materializadas, Decisión, Integridad, Motivo

### Community 83 - "Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?, Source Nodes

### Community 84 - "Q: ¿Qué arquitectura y postura de seguridad exige el arranque?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué arquitectura y postura de seguridad exige el arranque?, Source Nodes

### Community 85 - "Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?, Source Nodes

### Community 86 - "Q: ¿Cómo conecta Client 360 con los dominios empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo conecta Client 360 con los dominios empresariales?, Source Nodes

### Community 87 - "Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?, Source Nodes

### Community 88 - "Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?, Source Nodes

### Community 89 - "Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?, Source Nodes

### Community 90 - "Q: ¿Por qué Zyteron Control necesita dos servicios en Render?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Zyteron Control necesita dos servicios en Render?, Source Nodes

### Community 91 - "Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?, Source Nodes

### Community 92 - "Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?, Source Nodes

### Community 93 - "Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?, Source Nodes

### Community 94 - "Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?, Source Nodes

### Community 95 - "nest-cli.json"
Cohesion: 0.50
Nodes (3): collection, $schema, sourceRoot

### Community 96 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, apps_web_next_types_root_params_d, apps_web_next_types_routes_d

## Knowledge Gaps
- **502 isolated node(s):** `AssignmentRecommendation`, `AuditAttentionItem`, `AuditCheckResult`, `AuditCheckStatus`, `AuditEvent` (+497 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 960 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `@nestjs/common`, `ClientsRepository`, `actor`, `actorFromHeaders`, `documents.service.ts`, `support.service.ts`, `packages_contracts_dist_index`, `development.controller.ts`, `ContractsRepository`, `RenewalsRepository`, `SupportController`, `server-supabase.ts`, `audits.module.ts`, `ClientServicesRepository`, `SupportRepository`, `SalesService`, `ContactsRepository`, `Headers`, `Get`, `.list`, `OpportunitiesService`, `contracts.service.ts`, `crm.controller.ts`, `audits.controller.ts`, `UsersController`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `ClientsRepository`, `actorFromHeaders`, `documents.service.ts`, `operations-workspace.tsx`, `support.service.ts`, `packages_contracts_dist_index`, `development.controller.ts`, `development-workspace.tsx`, `RenewalsRepository`, `server-supabase.ts`, `audits.module.ts`, `SupportRepository`, `client-360.tsx`, `OperationsActor`, `GitHubSourceControlProvider`, `DocumentsRepository`, `DevelopmentRepository`, `audits.repository.ts`, `contracts.service.ts`, `audits.service.ts`, `api/package.json`, `crm.controller.ts`, `audits.controller.ts`, `audits.test.ts`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `OperationsService` connect `OperationsService` to `audits.test.ts`, `actorFromHeaders`, `operations-workspace.tsx`, `support.service.ts`, `DevelopmentReadService`, `development.controller.ts`, `development-workspace.tsx`, `DevelopmentRepository`, `OperationsRepository`, `pageBounds`, `audits.service.ts`, `OperationsActor`, `.getWorkOrder`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `AssignmentRecommendation`, `AuditAttentionItem`, `AuditCheckResult` to the rest of the system?**
  _502 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01020408163265306 - nodes in this community are weakly interconnected._
- **Should `@nestjs/common` be split into smaller, more focused modules?**
  _Cohesion score 0.0290633608815427 - nodes in this community are weakly interconnected._
- **Should `CommercialRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.051839464882943144 - nodes in this community are weakly interconnected._