# Graph Report - CONTROL ZYTERON  (2026-10-01)

## Corpus Check
- 207 files · ~52,381 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .css 4, (none) 2, .example 1)

## Summary
- 2256 nodes · 5833 edges · 125 communities (92 shown, 33 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 570 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4d1ce1f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ClientsRepository
- ContractsRepository
- ext_packages_contracts_dist_index_js
- index.ts
- packages_contracts_dist_index
- ContactsService
- CommercialRepository
- AuthController
- ClientServicesRepository
- development-workspace.tsx
- .publish
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_client
- react
- module-page.tsx
- web/package.json
- api/package.json
- 20260930120000_complete_client_domain.sql
- useAccess
- client-360.tsx
- 20260930070000_client_360.sql
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_roles
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientstatuses
- package.json
- Headers
- SalesService
- LeadsService
- @nestjs/common
- OpportunitiesService
- server-supabase.ts
- .index
- commercial-pipeline.tsx
- QuotesService
- new-client-wizard.tsx
- renewal-center.tsx
- Zyteron Control
- crm.controller.ts
- compilerOptions
- compilerOptions
- contracts/package.json
- client-hub.tsx
- compilerOptions
- commercial-workspace.tsx
- OperationsActor
- compilerOptions
- UsersController
- .index
- .index
- actor
- .index
- contracts.service.ts
- .index
- .index
- commercial.module.ts
- web_next_types_root_params_d
- .index
- .index
- .index
- .index
- OperationsService
- .index
- .index
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
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientcontact
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientevent
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clienthealthfactor
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clienthealthstatus
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientlistresponse
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientportalsettings
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientservice
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_commercialrecord
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_createclientinput
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_createcommercialrecord
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_pipelinestage
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_pipelinestages
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_pipelinesummary
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_role
- web_next_types_routes_d
- web_src_app_globals
- FollowUpsService
- RequireRoles
- development.controller.ts
- OperationsRepository
- CommercialController
- DevelopmentReadService
- .index
- .index
- .index
- pageBounds
- AGENTS.md
- development.service.ts
- Param
- .getProject
- operations-workspace.tsx
- OperationsModule
- ClientContact
- Get
- development.test.ts
- access-control.ts
- module-content.ts
- .remove
- .index
- .index
- .index

## God Nodes (most connected - your core abstractions)
1. `RequireRoles()` - 284 edges
2. `actorFromHeaders()` - 109 edges
3. `@nestjs/common` - 89 edges
4. `OperationsService` - 76 edges
5. `CommercialRepository` - 75 edges
6. `OperationsRepository` - 75 edges
7. `OperationsActor` - 50 edges
8. `formatDate()` - 47 edges
9. `required()` - 43 edges
10. `useAccess()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `ActivityTimeline()` --calls--> `formatDateTime()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/lib/date-time.ts
- `FollowUpCenter()` --calls--> `formatDateTime()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `GoalCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `HandoffCenter()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/commercial/commercial-workspace.tsx → apps/web/src/lib/date-time.ts
- `Milestones()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/operations/operations-workspace.tsx → apps/web/src/lib/date-time.ts

## Import Cycles
- None detected.

## Communities (125 total, 33 thin omitted)

### Community 0 - "ClientsRepository"
Cohesion: 0.05
Nodes (18): ClientsController, Body, Controller, Get, Param, Patch, Post, Query (+10 more)

### Community 1 - "ContractsRepository"
Cohesion: 0.08
Nodes (14): ClientContractsController, ContractsController, Body, Controller, Get, Param, Patch, Post (+6 more)

### Community 3 - "index.ts"
Cohesion: 0.02
Nodes (117): AssignmentRecommendation, billingFrequencies, BillingFrequency, BugHistory, BugStatus, ChangeRequest, Client, ClientContract (+109 more)

### Community 4 - "packages_contracts_dist_index"
Cohesion: 0.08
Nodes (34): eventService(), managers, readers, validateClientService(), ClientServicesModule, Module, ClientEventsService, Injectable (+26 more)

### Community 5 - "ContactsService"
Cohesion: 0.11
Nodes (17): ContactsController, managers, readers, Body, Controller, Get, Param, Patch (+9 more)

### Community 6 - "CommercialRepository"
Cohesion: 0.10
Nodes (3): CommercialRepository, now(), Injectable

### Community 7 - "AuthController"
Cohesion: 0.50
Nodes (3): AuthController, Controller, Get

### Community 8 - "ClientServicesRepository"
Cohesion: 0.09
Nodes (13): ClientServicesController, Body, Controller, Get, Param, Patch, Post, Query (+5 more)

### Community 9 - "development-workspace.tsx"
Cohesion: 0.09
Nodes (34): date(), sections, Services(), save(), OpportunityList(), Assignments(), Bugs(), Command() (+26 more)

### Community 10 - ".publish"
Cohesion: 0.07
Nodes (22): ClientRenewalsController, managers, readers, RenewalsController, Body, Controller, Get, Param (+14 more)

### Community 12 - "react"
Cohesion: 0.15
Nodes (6): apps_web_src_app_globals, metadata, DataTable(), EmptyState(), NotificationCenter(), react

### Community 13 - "module-page.tsx"
Cohesion: 0.09
Nodes (4): FilterBar(), StatusBadge(), ModulePage(), lucide-react

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (33): nextConfig, dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js (+25 more)

### Community 15 - "api/package.json"
Cohesion: 0.05
Nodes (36): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+28 more)

### Community 16 - "20260930120000_complete_client_domain.sql"
Cohesion: 0.09
Nodes (26): public.client_assignments, public.client_portal_users, public.client_services, public.clients, public.sync_client_domain_renewal, public.sync_renewal_notification_schedule, client_contracts_sync_renewal, client_domain_audit_client_idx (+18 more)

### Community 17 - "useAccess"
Cohesion: 0.06
Nodes (41): AccessContext, AccessContextValue, useAccess(), ClientOperations(), ContactCard(), ContactDirectory(), ContactForm(), emptySummary (+33 more)

### Community 18 - "client-360.tsx"
Cohesion: 0.09
Nodes (18): ActivityTimeline(), Client360(), ClientContracts(), ClientRenewals(), ClientTab, Commercial(), Contacts(), formatMoney() (+10 more)

### Community 19 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 22 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 23 - "Headers"
Cohesion: 0.11
Nodes (17): DeliverablesController, deliveryRoles, DeploymentsController, HeadersMap, managerRoles, MilestonesController, ProjectsController, readRoles (+9 more)

### Community 24 - "SalesService"
Cohesion: 0.08
Nodes (13): CommissionsController, HandoffsController, SalesController, SalesGoalsController, Body, Controller, Get, Headers (+5 more)

### Community 25 - "LeadsService"
Cohesion: 0.14
Nodes (11): LeadsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 26 - "@nestjs/common"
Cohesion: 0.07
Nodes (47): AuditsModule, Module, AuthModule, Module, Public(), clientDomainModules, CrmModule, Module (+39 more)

### Community 27 - "OpportunitiesService"
Cohesion: 0.14
Nodes (11): OpportunitiesController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 28 - "server-supabase.ts"
Cohesion: 0.18
Nodes (10): RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, createServerSupabase(), Module, UsersModule, packages_contracts_dist_index_role (+2 more)

### Community 29 - ".index"
Cohesion: 0.50
Nodes (3): HrController, Controller, Get

### Community 30 - "commercial-pipeline.tsx"
Cohesion: 0.12
Nodes (13): CommercialPipeline(), money, stages, fallbackRecords, money, stageLabels, stages, ControlDashboard() (+5 more)

### Community 31 - "QuotesService"
Cohesion: 0.11
Nodes (6): clip(), escapePdf(), money(), text(), QuotesService, Injectable

### Community 32 - "new-client-wizard.tsx"
Cohesion: 0.24
Nodes (8): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, isValidRut(), normalizeRut()

### Community 33 - "renewal-center.tsx"
Cohesion: 0.15
Nodes (17): countdown(), empty, groupItems(), label(), money(), RenewalActions(), RenewalCalendar(), RenewalCard() (+9 more)

### Community 34 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 35 - "crm.controller.ts"
Cohesion: 0.18
Nodes (9): CrmController, Body, Controller, Get, Post, CrmService, Injectable, packages_contracts_dist_index_createcommercialrecord (+1 more)

### Community 36 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, rootDir, strictPropertyInitialization (+5 more)

### Community 37 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowJs, incremental, jsx, lib, module, noEmit, paths (+5 more)

### Community 38 - "contracts/package.json"
Cohesion: 0.14
Nodes (13): devDependencies, typescript, exports, typescript, main, name, private, scripts (+5 more)

### Community 39 - "client-hub.tsx"
Cohesion: 0.13
Nodes (15): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode (+7 more)

### Community 40 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, extends, include (+1 more)

### Community 41 - "commercial-workspace.tsx"
Cohesion: 0.09
Nodes (17): sections, sections, CatalogItem, Command(), CommercialWorkspace(), CommissionCenter(), emptySummary, FollowUpCenter() (+9 more)

### Community 42 - "OperationsActor"
Cohesion: 0.13
Nodes (6): DevelopmentManagementService, QualityService, ReleaseService, Injectable, uuid(), OperationsActor

### Community 43 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, noUncheckedIndexedAccess, skipLibCheck, strict, target

### Community 44 - "UsersController"
Cohesion: 0.25
Nodes (5): Controller, Get, Injectable, UsersController, UsersDirectoryService

### Community 45 - ".index"
Cohesion: 0.50
Nodes (3): AuditsController, Controller, Get

### Community 46 - ".index"
Cohesion: 0.50
Nodes (3): FinanceController, Controller, Get

### Community 47 - "actor"
Cohesion: 0.22
Nodes (10): actor(), CommercialQuotesController, Body, Controller, Get, Headers, Param, Patch (+2 more)

### Community 48 - ".index"
Cohesion: 0.50
Nodes (3): MonitoringController, Controller, Get

### Community 49 - "contracts.service.ts"
Cohesion: 0.10
Nodes (16): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider, managers, readers, validateContract(), ContractsModule (+8 more)

### Community 50 - ".index"
Cohesion: 0.50
Nodes (3): PermissionsController, Controller, Get

### Community 51 - ".index"
Cohesion: 0.50
Nodes (3): ProjectsController, Controller, Get

### Community 52 - "commercial.module.ts"
Cohesion: 0.07
Nodes (39): roles, CommercialModule, Module, PageInput, CommercialService, Injectable, pageQuery(), scopedPageQuery() (+31 more)

### Community 54 - ".index"
Cohesion: 0.50
Nodes (3): ReportsController, Controller, Get

### Community 55 - ".index"
Cohesion: 0.50
Nodes (3): RolesController, Controller, Get

### Community 56 - ".index"
Cohesion: 0.50
Nodes (3): SecurityController, Controller, Get

### Community 57 - ".index"
Cohesion: 0.50
Nodes (3): SettingsController, Controller, Get

### Community 58 - "OperationsService"
Cohesion: 0.10
Nodes (4): OperationsPageInput, page(), OperationsService, Injectable

### Community 59 - ".index"
Cohesion: 0.50
Nodes (3): Controller, Get, VaultController

### Community 60 - ".index"
Cohesion: 0.50
Nodes (3): Controller, Get, WorkOrdersController

### Community 62 - "ADR-002 — Renovaciones materializadas"
Cohesion: 0.40
Nodes (4): ADR-002 — Renovaciones materializadas, Decisión, Integridad, Motivo

### Community 63 - "Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cuál es el primer vertical funcional para iniciar Zyteron Control?, Source Nodes

### Community 64 - "Q: ¿Qué arquitectura y postura de seguridad exige el arranque?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué arquitectura y postura de seguridad exige el arranque?, Source Nodes

### Community 65 - "Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?, Source Nodes

### Community 66 - "Q: ¿Cómo conecta Client 360 con los dominios empresariales?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Cómo conecta Client 360 con los dominios empresariales?, Source Nodes

### Community 67 - "Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?, Source Nodes

### Community 68 - "Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?, Source Nodes

### Community 69 - "Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?, Source Nodes

### Community 70 - "Q: ¿Por qué Zyteron Control necesita dos servicios en Render?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué Zyteron Control necesita dos servicios en Render?, Source Nodes

### Community 71 - "Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?, Source Nodes

### Community 72 - "Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?, Source Nodes

### Community 73 - "Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?, Source Nodes

### Community 74 - "Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?, Source Nodes

### Community 75 - "nest-cli.json"
Cohesion: 0.50
Nodes (3): collection, $schema, sourceRoot

### Community 76 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, apps_web_next_types_root_params_d, apps_web_next_types_routes_d

### Community 95 - "FollowUpsService"
Cohesion: 0.12
Nodes (11): FollowUpsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 96 - "RequireRoles"
Cohesion: 0.22
Nodes (6): RequireRoles(), DevelopmentController, Get, Headers, Query, actorFromHeaders()

### Community 97 - "development.controller.ts"
Cohesion: 0.08
Nodes (17): DevelopmentWebhooksController, EnvironmentsController, HeaderMap, IntegrationsController, leadRoles, qaRoles, readRoles, RepositoriesController (+9 more)

### Community 98 - "OperationsRepository"
Cohesion: 0.08
Nodes (4): now(), OperationsRepository, relationName(), Injectable

### Community 99 - "CommercialController"
Cohesion: 0.17
Nodes (4): CommercialController, Controller, Get, Query

### Community 102 - "DevelopmentReadService"
Cohesion: 0.11
Nodes (11): camel(), DevelopmentRepository, Filter, fromRow(), now(), projectTables, Row, snake() (+3 more)

### Community 103 - ".index"
Cohesion: 0.50
Nodes (3): DocumentsController, Controller, Get

### Community 104 - ".index"
Cohesion: 0.50
Nodes (3): QuotesController, Controller, Get

### Community 105 - ".index"
Cohesion: 0.50
Nodes (3): SupportController, Controller, Get

### Community 106 - "pageBounds"
Cohesion: 0.17
Nodes (5): page(), ContactsRepository, Injectable, cleanSearch(), pageBounds()

### Community 108 - "development.service.ts"
Cohesion: 0.09
Nodes (29): managers, page, percent(), technicalRoles, DevelopmentProjectView(), label(), base(), developmentApi (+21 more)

### Community 109 - "Param"
Cohesion: 0.16
Nodes (8): BugsController, ProjectDevelopmentController, QaController, ReleasesController, Body, Param, Patch, Post

### Community 110 - ".getProject"
Cohesion: 0.18
Nodes (3): optionalUuid(), required(), asNumber()

### Community 111 - "operations-workspace.tsx"
Cohesion: 0.05
Nodes (42): commercialRoles, managerRoles, operationsRoles, projectTransitions, taskTransitions, workTransitions, Deliverables(), Deployments() (+34 more)

### Community 116 - "Get"
Cohesion: 0.18
Nodes (4): OperationsController, Get, Query, operationsPage()

### Community 117 - "development.test.ts"
Cohesion: 0.08
Nodes (13): CIProvider, DeploymentProvider, GitHubActionsProvider, GitHubSourceControlProvider, RenderDeploymentProvider, SourceControlProvider, Injectable, unavailable() (+5 more)

### Community 118 - "access-control.ts"
Cohesion: 0.23
Nodes (8): PermissionGate(), RoleGuard(), EnterpriseShell(), accessByRole, canAccessGroup(), groupForPath(), RoleProfile, roleProfiles

### Community 119 - "module-content.ts"
Cohesion: 0.28
Nodes (6): getModuleDescriptor(), groupContent, ModuleDescriptor, enterpriseNavigation, NavigationGroup, NavigationItem

### Community 127 - ".index"
Cohesion: 0.50
Nodes (3): IncidentsController, Controller, Get

### Community 128 - ".index"
Cohesion: 0.50
Nodes (3): NotificationsController, Controller, Get

### Community 129 - ".index"
Cohesion: 0.50
Nodes (3): TasksController, Controller, Get

## Knowledge Gaps
- **391 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `name`, `version` (+386 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 739 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `ClientsRepository`, `ContractsRepository`, `.index`, `.index`, `packages_contracts_dist_index`, `ContactsService`, `ClientServicesRepository`, `.publish`, `Headers`, `SalesService`, `LeadsService`, `@nestjs/common`, `OpportunitiesService`, `server-supabase.ts`, `.index`, `crm.controller.ts`, `UsersController`, `.index`, `.index`, `actor`, `.index`, `contracts.service.ts`, `.index`, `.index`, `commercial.module.ts`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `FollowUpsService`, `development.controller.ts`, `CommercialController`, `.index`, `.index`, `.index`, `Param`, `Get`, `.remove`, `.index`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `ClientsRepository`, `development.controller.ts`, `crm.controller.ts`, `packages_contracts_dist_index`, `ContactsService`, `DevelopmentReadService`, `.publish`, `development.service.ts`, `api/package.json`, `operations-workspace.tsx`, `contracts.service.ts`, `commercial.module.ts`, `development.test.ts`, `Headers`, `server-supabase.ts`, `QuotesService`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `OperationsRepository` connect `OperationsRepository` to `.getWorkOrder`, `pageBounds`, `.getProject`, `operations-workspace.tsx`, `Get`, `development.test.ts`, `Headers`, `.remove`, `OperationsService`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _391 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ClientsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.05418227215980025 - nodes in this community are weakly interconnected._
- **Should `ContractsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
