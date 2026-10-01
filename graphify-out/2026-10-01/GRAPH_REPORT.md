# Graph Report - CONTROL ZYTERON  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3079 nodes · 8522 edges · 148 communities (106 shown, 42 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 909 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de5a98e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- RequireRoles
- documents.service.ts
- CommercialRepository
- operations-workspace.tsx
- packages_contracts_dist_index
- RenewalsRepository
- development-workspace.tsx
- ClientServicesRepository
- client-domain-api.ts
- support.service.ts
- ContractsRepository
- OperationsRepository
- QualityService
- SupportController
- module-page.tsx
- useAccess
- OperationsActor
- SupportRepository
- ClientsRepository
- actor
- Param
- client-360.tsx
- app.module.ts
- SupportTicketService
- audits.service.ts
- audits.controller.ts
- DocumentsRepository
- SalesService
- documents-workspace.tsx
- .getProject
- compilerOptions
- GitHubSourceControlProvider
- DocumentService
- react
- 20260930120000_complete_client_domain.sql
- actor
- Get
- client-domain.test.ts
- LeadsService
- DevelopmentReadService
- commercial-workspace.tsx
- OpportunitiesService
- .publish
- client-integrations.service.ts
- OperationsService
- 20260930070000_client_360.sql
- @nestjs/common
- FollowUpsService
- support-workspace.tsx
- Get
- AuditsRepository
- ClientsController
- pageBounds
- package.json
- renewal-center.tsx
- crm.controller.ts
- CommercialService
- api/package.json
- ContactsRepository
- contracts.service.ts
- Zyteron Control
- contracts/package.json
- 20261001080000_document_control_center.sql
- web/package.json
- 20261001060000_service_desk_support_center.sql
- development.test.ts
- users.module.ts
- client-hub.tsx
- .updatePortal
- Public
- dependencies
- clients.dto.ts
- compilerOptions
- dependencies
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
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- .index
- next-env.d.ts
- activity-feed.tsx
- AGENTS.md
- ClientContact
- Controller
- Get
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
1. `RequireRoles()` - 426 edges
2. `actorFromHeaders()` - 141 edges
3. `@nestjs/common` - 105 edges
4. `OperationsActor` - 82 edges
5. `OperationsService` - 80 edges
6. `OperationsRepository` - 75 edges
7. `CommercialRepository` - 75 edges
8. `useAccess()` - 55 edges
9. `formatDate()` - 54 edges
10. `required()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `ContactCard()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/contact-directory.tsx → apps/web/src/components/access-context.tsx
- `KnowledgeView()` --calls--> `formatDateTime()`  [EXTRACTED]
  apps/web/src/components/support/support-workspace.tsx → apps/web/src/lib/date-time.ts
- `GoalCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `HandoffCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `SupportActor` --inherits--> `OperationsActor`  [EXTRACTED]
  apps/api/src/support/support.service.ts → apps/api/src/operations/operations.service.ts

## Import Cycles
- None detected.

## Communities (148 total, 42 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.01
Nodes (195): AssignmentRecommendation, AuditAttentionItem, AuditCheckResult, AuditCheckStatus, auditCheckStatuses, AuditEvent, AuditEvidence, AuditFinding (+187 more)

### Community 1 - "RequireRoles"
Cohesion: 0.05
Nodes (50): RequireRoles(), BugsController, DevelopmentController, DevelopmentWebhooksController, EnvironmentsController, HeaderMap, IntegrationsController, leadRoles (+42 more)

### Community 2 - "documents.service.ts"
Cohesion: 0.07
Nodes (40): ClientDocumentsController, DocumentReviewsController, DocumentShareLinksController, DocumentTemplatesController, header(), HeaderMap, readers, SharedDocumentsController (+32 more)

### Community 3 - "CommercialRepository"
Cohesion: 0.07
Nodes (5): CommercialRepository, now(), Injectable, QuotesService, Injectable

### Community 4 - "operations-workspace.tsx"
Cohesion: 0.05
Nodes (42): commercialRoles, managerRoles, operationsRoles, projectTransitions, taskTransitions, workTransitions, Command(), Deliverables() (+34 more)

### Community 5 - "packages_contracts_dist_index"
Cohesion: 0.07
Nodes (43): CommercialModule, Module, PageInput, pageQuery(), scopedPageQuery(), uuidPattern, roles, readers (+35 more)

### Community 6 - "RenewalsRepository"
Cohesion: 0.07
Nodes (24): createServerSupabase(), pagination(), ClientRenewalsController, managers, readers, RenewalsController, Body, Controller (+16 more)

### Community 7 - "development-workspace.tsx"
Cohesion: 0.06
Nodes (52): managers, page, percent(), technicalRoles, sections, DevelopmentProjectView(), label(), Assignments() (+44 more)

### Community 8 - "ClientServicesRepository"
Cohesion: 0.07
Nodes (24): ClientServicesController, managers, readers, Body, Controller, Get, Param, Patch (+16 more)

### Community 9 - "client-domain-api.ts"
Cohesion: 0.06
Nodes (42): ContactCard(), ContactDirectory(), emptySummary, groupItems(), types, ContractCenter(), ContractDetail(), upload() (+34 more)

### Community 10 - "support.service.ts"
Cohesion: 0.06
Nodes (46): agents, header(), HeaderMap, managers, readers, DeferredMailSupportProvider, SupportChannelProvider, SupportCopilotProvider (+38 more)

### Community 11 - "ContractsRepository"
Cohesion: 0.08
Nodes (14): ClientContractsController, ContractsController, Body, Controller, Get, Param, Patch, Post (+6 more)

### Community 12 - "OperationsRepository"
Cohesion: 0.07
Nodes (4): now(), OperationsRepository, relationName(), Injectable

### Community 13 - "QualityService"
Cohesion: 0.07
Nodes (16): camel(), DevelopmentRepository, Filter, fromRow(), now(), projectTables, Row, snake() (+8 more)

### Community 14 - "SupportController"
Cohesion: 0.16
Nodes (10): actor(), ClientSupportController, SupportController, SupportKnowledgeController, Body, Controller, Headers, Param (+2 more)

### Community 15 - "module-page.tsx"
Cohesion: 0.06
Nodes (20): PermissionGate(), RoleGuard(), DataTable(), EmptyState(), FilterBar(), NotificationCenter(), StatusBadge(), ModulePage() (+12 more)

### Community 16 - "useAccess"
Cohesion: 0.06
Nodes (33): apps_web_src_app_audits, useAccess(), AuditDetailView(), AuditsView(), AuditWorkspace(), CommandCenter(), EvidenceView(), FindingsView() (+25 more)

### Community 17 - "OperationsActor"
Cohesion: 0.15
Nodes (7): AuditExecutionService, AuditFindingService, date(), now(), required(), uuid(), OperationsActor

### Community 18 - "SupportRepository"
Cohesion: 0.09
Nodes (15): SupportInboundMessage, camel(), Filters, fromRow(), now(), relation(), Row, selectFor() (+7 more)

### Community 19 - "ClientsRepository"
Cohesion: 0.09
Nodes (4): ClientsRepository, Injectable, ClientsService, Injectable

### Community 20 - "actor"
Cohesion: 0.17
Nodes (10): actor(), DocumentsController, Body, Delete, Get, Headers, Param, Patch (+2 more)

### Community 21 - "Param"
Cohesion: 0.16
Nodes (7): AuditsController, FindingsController, Body, Headers, Param, Patch, Post

### Community 22 - "client-360.tsx"
Cohesion: 0.07
Nodes (28): ClientPatch, InitialContact, InitialService, Client360(), ClientContracts(), ClientOperations(), ClientRenewals(), ClientTab (+20 more)

### Community 23 - "app.module.ts"
Cohesion: 0.06
Nodes (34): AuditsModule, Module, RoleGuard, Injectable, ClientsModule, Module, managers, readers (+26 more)

### Community 24 - "SupportTicketService"
Cohesion: 0.11
Nodes (5): now(), required(), SupportKnowledgeService, SupportTicketService, uuid()

### Community 25 - "audits.service.ts"
Cohesion: 0.07
Nodes (30): AuditAutomationProvider, AuditReportRenderer, DeferredPerformanceAuditProvider, PerformanceAuditProvider, RenderedAuditReport, reservedHost(), SafeAutomationResult, SafeHttpAuditProvider (+22 more)

### Community 26 - "audits.controller.ts"
Cohesion: 0.08
Nodes (17): AuditEvidenceController, AuditReportsController, AuditTemplatesController, AuditTemplateVersionsController, executeRoles, HeaderMap, managerRoles, readRoles (+9 more)

### Community 27 - "DocumentsRepository"
Cohesion: 0.09
Nodes (9): camel(), DocumentsRepository, Filters, fromRow(), now(), Row, snake(), toRow() (+1 more)

### Community 28 - "SalesService"
Cohesion: 0.08
Nodes (12): CommissionsController, HandoffsController, SalesController, Body, Controller, Get, Headers, Param (+4 more)

### Community 29 - "documents-workspace.tsx"
Cohesion: 0.09
Nodes (26): apps_web_src_app_documents, AccessContext, AccessContextValue, Command(), DocumentRecord(), DocumentsWorkspace(), act(), domainLink (+18 more)

### Community 30 - ".getProject"
Cohesion: 0.16
Nodes (4): optionalUuid(), required(), uuid(), asNumber()

### Community 31 - "compilerOptions"
Cohesion: 0.06
Nodes (33): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, rootDir, strictPropertyInitialization (+25 more)

### Community 32 - "GitHubSourceControlProvider"
Cohesion: 0.10
Nodes (8): CIProvider, DeploymentProvider, GitHubActionsProvider, GitHubSourceControlProvider, RenderDeploymentProvider, SourceControlProvider, Injectable, unavailable()

### Community 33 - "DocumentService"
Cohesion: 0.16
Nodes (6): compatible(), detectMime(), DocumentService, now(), required(), uuid()

### Community 34 - "react"
Cohesion: 0.08
Nodes (17): apps_web_src_app_globals, metadata, CommercialPipeline(), money, stages, fallbackRecords, money, stageLabels (+9 more)

### Community 35 - "20260930120000_complete_client_domain.sql"
Cohesion: 0.09
Nodes (26): public.client_assignments, public.client_services, public.clients, public.sync_client_domain_renewal, public.sync_renewal_notification_schedule, client_contracts_sync_renewal, client_domain_audit_client_idx, client_domain_notifications_user_idx (+18 more)

### Community 36 - "actor"
Cohesion: 0.20
Nodes (10): actor(), CommercialQuotesController, Body, Controller, Get, Headers, Param, Patch (+2 more)

### Community 37 - "Get"
Cohesion: 0.10
Nodes (6): SupportRelationsController, Get, Query, SupportPage, supportPage(), SupportReadService

### Community 38 - "client-domain.test.ts"
Cohesion: 0.12
Nodes (17): eventService(), ClientEventsService, Injectable, ClientDomainHealthSignals, ClientHealthService, Injectable, ClientIntegrationsService, Injectable (+9 more)

### Community 39 - "LeadsService"
Cohesion: 0.14
Nodes (11): LeadsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 41 - "commercial-workspace.tsx"
Cohesion: 0.09
Nodes (17): sections, sections, CatalogItem, Command(), CommercialWorkspace(), CommissionCenter(), emptySummary, GoalCenter() (+9 more)

### Community 42 - "OpportunitiesService"
Cohesion: 0.15
Nodes (11): OpportunitiesController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 43 - ".publish"
Cohesion: 0.14
Nodes (12): ContactsController, Body, Controller, Get, Param, Patch, Post, Query (+4 more)

### Community 44 - "client-integrations.service.ts"
Cohesion: 0.08
Nodes (19): clientDomainModules, clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider, FinanceModule, Module, MonitoringModule (+11 more)

### Community 46 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 47 - "@nestjs/common"
Cohesion: 0.22
Nodes (7): PUBLIC_ROUTE, REQUIRED_ROLES, roles, emptyDomain(), TasksModule, Module, @nestjs/common

### Community 48 - "FollowUpsService"
Cohesion: 0.14
Nodes (11): FollowUpsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 49 - "support-workspace.tsx"
Cohesion: 0.12
Nodes (16): apps_web_src_app_support, active(), Command(), CreateTicket(), InboxView(), KnowledgeView(), label(), labels (+8 more)

### Community 50 - "Get"
Cohesion: 0.11
Nodes (5): ProjectAuditsController, Get, Query, AuditPage, AuditReadService

### Community 51 - "AuditsRepository"
Cohesion: 0.18
Nodes (13): AuditsRepository, camel(), excluded, Filters, fromRow(), relationValue(), Row, selectFor() (+5 more)

### Community 52 - "ClientsController"
Cohesion: 0.21
Nodes (5): ClientsController, Controller, Get, Param, Query

### Community 53 - "pageBounds"
Cohesion: 0.20
Nodes (4): page(), cleanSearch(), pageBounds(), page()

### Community 54 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 55 - "renewal-center.tsx"
Cohesion: 0.16
Nodes (16): countdown(), empty, groupItems(), label(), money(), RenewalActions(), RenewalCalendar(), RenewalCard() (+8 more)

### Community 56 - "crm.controller.ts"
Cohesion: 0.15
Nodes (11): CrmController, Body, Controller, Get, Post, CrmModule, Module, CrmService (+3 more)

### Community 58 - "CommercialService"
Cohesion: 0.16
Nodes (6): CommercialController, Controller, Get, Query, CommercialService, Injectable

### Community 59 - "api/package.json"
Cohesion: 0.13
Nodes (14): @types/node, vitest, name, private, type, version, AppModule, Module (+6 more)

### Community 61 - "contracts.service.ts"
Cohesion: 0.22
Nodes (10): managers, readers, validateContract(), ContractsModule, Module, transitions, packages_contracts_dist_index_clientcontract, packages_contracts_dist_index_contractstatus (+2 more)

### Community 62 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 63 - "contracts/package.json"
Cohesion: 0.14
Nodes (13): typescript, devDependencies, typescript, exports, main, name, private, scripts (+5 more)

### Community 64 - "20261001080000_document_control_center.sql"
Cohesion: 0.14
Nodes (6): public.document_event_outbox, public.prevent_document_version_mutation, document_events_outbox, document_versions_immutable, private.document_portal_client_id(), public.client_portal_users

### Community 65 - "web/package.json"
Cohesion: 0.15
Nodes (11): @supabase/supabase-js, @zyteron/contracts, nextConfig, vitest, name, private, version, @next/env (+3 more)

### Community 66 - "20261001060000_service_desk_support_center.sql"
Cohesion: 0.15
Nodes (6): public.knowledge_version_immutable, public.support_event_to_outbox, knowledge_version_immutable, private.support_portal_client_id(), public.client_portal_users, support_event_outbox

### Community 67 - "development.test.ts"
Cohesion: 0.29
Nodes (5): manager, manager, ref_node_fs, ref_node_path, ref_vitest

### Community 69 - "users.module.ts"
Cohesion: 0.18
Nodes (8): Controller, Get, Injectable, Module, UsersController, UsersDirectoryService, UsersModule, packages_contracts_dist_index_roles

### Community 70 - "client-hub.tsx"
Cohesion: 0.21
Nodes (8): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode

### Community 72 - ".updatePortal"
Cohesion: 0.25
Nodes (3): Body, Patch, Post

### Community 73 - "Public"
Cohesion: 0.22
Nodes (7): AuthController, AuthModule, Controller, Get, Module, Public(), Get

### Community 74 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+1 more)

### Community 75 - "clients.dto.ts"
Cohesion: 0.50
Nodes (6): optionalUuid(), parsePagination(), validateCreateClient(), isValidChileanRut(), normalizeRut(), packages_contracts_dist_index_clientstatuses

### Community 77 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, noUncheckedIndexedAccess, skipLibCheck, strict, target

### Community 78 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js, @zyteron/contracts

### Community 79 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 80 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @types/node, @types/react, @types/react-dom, typescript, vitest

### Community 81 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 82 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, @nestjs/cli, @types/node, typescript, vitest

### Community 84 - "ADR-002 — Renovaciones materializadas"
Cohesion: 0.40
Nodes (4): ADR-002 — Renovaciones materializadas, Decisión, Integridad, Motivo

### Community 85 - "Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?, Source Nodes

### Community 86 - "Q: ¿Qué arquitectura y postura de seguridad exige el arranque?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué arquitectura y postura de seguridad exige el arranque?, Source Nodes

### Community 87 - "Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?, Source Nodes

### Community 88 - "Q: ¿Cómo conecta Client 360 con los dominios empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo conecta Client 360 con los dominios empresariales?, Source Nodes

### Community 89 - "Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?, Source Nodes

### Community 90 - "Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?, Source Nodes

### Community 91 - "Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?, Source Nodes

### Community 92 - "Q: ¿Por qué Zyteron Control necesita dos servicios en Render?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Zyteron Control necesita dos servicios en Render?, Source Nodes

### Community 93 - "Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?, Source Nodes

### Community 94 - "Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?, Source Nodes

### Community 95 - "Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?, Source Nodes

### Community 96 - "Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?, Source Nodes

### Community 97 - "nest-cli.json"
Cohesion: 0.50
Nodes (3): collection, $schema, sourceRoot

### Community 98 - ".index"
Cohesion: 0.50
Nodes (3): FinanceController, Controller, Get

### Community 99 - ".index"
Cohesion: 0.50
Nodes (3): HrController, Controller, Get

### Community 100 - ".index"
Cohesion: 0.50
Nodes (3): IncidentsController, Controller, Get

### Community 101 - ".index"
Cohesion: 0.50
Nodes (3): MonitoringController, Controller, Get

### Community 102 - ".index"
Cohesion: 0.50
Nodes (3): NotificationsController, Controller, Get

### Community 103 - ".index"
Cohesion: 0.50
Nodes (3): PermissionsController, Controller, Get

### Community 104 - ".index"
Cohesion: 0.50
Nodes (3): ProjectsController, Controller, Get

### Community 105 - ".index"
Cohesion: 0.50
Nodes (3): QuotesController, Controller, Get

### Community 106 - ".index"
Cohesion: 0.50
Nodes (3): ReportsController, Controller, Get

### Community 107 - ".index"
Cohesion: 0.50
Nodes (3): RolesController, Controller, Get

### Community 108 - ".index"
Cohesion: 0.50
Nodes (3): SecurityController, Controller, Get

### Community 109 - ".index"
Cohesion: 0.50
Nodes (3): SettingsController, Controller, Get

### Community 110 - ".index"
Cohesion: 0.50
Nodes (3): TasksController, Controller, Get

### Community 111 - ".index"
Cohesion: 0.50
Nodes (3): Controller, Get, VaultController

### Community 112 - ".index"
Cohesion: 0.50
Nodes (3): Controller, Get, WorkOrdersController

### Community 113 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, apps_web_next_types_root_params_d, apps_web_next_types_routes_d

## Knowledge Gaps
- **502 isolated node(s):** `AssignmentRecommendation`, `AuditAttentionItem`, `AuditCheckResult`, `AuditCheckStatus`, `AuditEvent` (+497 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 941 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `documents.service.ts`, `packages_contracts_dist_index`, `RenewalsRepository`, `ClientServicesRepository`, `support.service.ts`, `ContractsRepository`, `SupportController`, `SupportRepository`, `actor`, `Param`, `app.module.ts`, `audits.controller.ts`, `DocumentsRepository`, `SalesService`, `actor`, `Get`, `client-domain.test.ts`, `LeadsService`, `OpportunitiesService`, `.publish`, `@nestjs/common`, `FollowUpsService`, `Get`, `ClientsController`, `crm.controller.ts`, `CommercialService`, `contracts.service.ts`, `users.module.ts`, `.updatePortal`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `RequireRoles`, `documents.service.ts`, `operations-workspace.tsx`, `packages_contracts_dist_index`, `RenewalsRepository`, `development-workspace.tsx`, `ClientServicesRepository`, `client-domain-api.ts`, `support.service.ts`, `QualityService`, `SupportRepository`, `client-360.tsx`, `app.module.ts`, `audits.service.ts`, `audits.controller.ts`, `DocumentsRepository`, `GitHubSourceControlProvider`, `client-domain.test.ts`, `client-integrations.service.ts`, `AuditsRepository`, `crm.controller.ts`, `api/package.json`, `contracts.service.ts`, `development.test.ts`, `users.module.ts`, `Public`, `clients.dto.ts`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `OperationsRepository` connect `OperationsRepository` to `RequireRoles`, `development.test.ts`, `operations-workspace.tsx`, `.getWorkOrder`, `OperationsService`, `pageBounds`, `.getProject`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `AssignmentRecommendation`, `AuditAttentionItem`, `AuditCheckResult` to the rest of the system?**
  _502 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01020408163265306 - nodes in this community are weakly interconnected._
- **Should `RequireRoles` be split into smaller, more focused modules?**
  _Cohesion score 0.05097586029789419 - nodes in this community are weakly interconnected._
- **Should `documents.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06542443064182195 - nodes in this community are weakly interconnected._