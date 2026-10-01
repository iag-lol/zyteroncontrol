# Graph Report - CONTROL ZYTERON  (2026-10-01)

## Corpus Check
- 196 files · ~47,124 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 3, (none) 2, .example 1)

## Summary
- 1956 nodes · 4756 edges · 126 communities (85 shown, 41 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 434 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e2e97f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ClientsRepository
- ContractsRepository
- ext_packages_contracts_dist_index_js
- index.ts
- client-domain.test.ts
- ContactsRepository
- CommercialRepository
- auth.module.ts
- ClientServicesRepository
- useAccess
- RenewalsRepository
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_client
- enterprise-shell.tsx
- ModulePage
- web/package.json
- api/package.json
- 20260930120000_complete_client_domain.sql
- client-domain-api.ts
- client-360.tsx
- 20260930070000_client_360.sql
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_roles
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientstatuses
- package.json
- RequireRoles
- SalesService
- LeadsService
- @nestjs/common
- OpportunitiesController
- users.module.ts
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
- clients.dto.ts
- compilerOptions
- UsersController
- .index
- .index
- actor
- .index
- contracts.module.ts
- .index
- .index
- packages_contracts_dist_index
- web_next_types_root_params_d
- .index
- .index
- .index
- .index
- ClientsController
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
- ClientsService
- module-page.tsx
- OperationsRepository
- CommercialController
- .updatePortal
- .index
- .index
- .index
- pageBounds
- AGENTS.md
- RenewalsModule
- control-dashboard.tsx
- now
- operations-workspace.tsx
- OperationsModule
- ClientContact
- TasksModule
- ref_vitest
- module-content.ts
- .index
- .index
- .index
- .index

## God Nodes (most connected - your core abstractions)
1. `RequireRoles()` - 226 edges
2. `@nestjs/common` - 84 edges
3. `CommercialRepository` - 75 edges
4. `OperationsRepository` - 74 edges
5. `OperationsService` - 68 edges
6. `actorFromHeaders()` - 55 edges
7. `actor()` - 39 edges
8. `emptyDomain()` - 39 edges
9. `useAccess()` - 38 edges
10. `formatDate()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `save()` --indirect_call--> `date()`  [INFERRED]
  apps/web/src/components/clients/client-360.tsx → apps/api/src/commercial/quote-document.service.ts
- `Milestones()` --calls--> `formatDate()`  [EXTRACTED]
  apps/web/src/components/operations/operations-workspace.tsx → apps/web/src/lib/date-time.ts
- `eventService()` --calls--> `ClientsRepository`  [EXTRACTED]
  apps/api/src/client-domain.test.ts → apps/api/src/clients/clients.repository.ts
- `Client360()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `ClientOperations()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx

## Import Cycles
- None detected.

## Communities (126 total, 41 thin omitted)

### Community 1 - "ContractsRepository"
Cohesion: 0.05
Nodes (27): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider, ClientContractsController, ContractsController, managers, readers (+19 more)

### Community 3 - "index.ts"
Cohesion: 0.02
Nodes (93): billingFrequencies, BillingFrequency, ChangeRequest, Client, ClientContract, ClientEvent, ClientHealthFactor, ClientHealthStatus (+85 more)

### Community 4 - "client-domain.test.ts"
Cohesion: 0.12
Nodes (15): eventService(), ClientEventsService, Injectable, ClientDomainHealthSignals, ClientHealthService, Injectable, ClientIntegrationsService, Injectable (+7 more)

### Community 5 - "ContactsRepository"
Cohesion: 0.09
Nodes (20): ContactsController, managers, readers, Body, Controller, Get, Param, Patch (+12 more)

### Community 6 - "CommercialRepository"
Cohesion: 0.08
Nodes (3): CommercialRepository, now(), Injectable

### Community 7 - "auth.module.ts"
Cohesion: 0.18
Nodes (9): AuthController, AuthModule, Controller, Get, Module, Public(), HealthController, Controller (+1 more)

### Community 8 - "ClientServicesRepository"
Cohesion: 0.07
Nodes (21): ClientServicesController, managers, readers, Body, Controller, Get, Param, Patch (+13 more)

### Community 9 - "useAccess"
Cohesion: 0.09
Nodes (15): useAccess(), Contacts(), PortalPanel(), SettingsPanel(), archive(), ContactCard(), ContactDirectory(), ContactForm() (+7 more)

### Community 10 - "RenewalsRepository"
Cohesion: 0.08
Nodes (20): ClientRenewalsController, managers, readers, RenewalsController, Body, Controller, Get, Param (+12 more)

### Community 12 - "enterprise-shell.tsx"
Cohesion: 0.09
Nodes (18): apps_web_src_app_globals, metadata, AccessContext, AccessContextValue, PermissionGate(), RoleGuard(), EmptyState(), NotificationCenter() (+10 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (33): nextConfig, dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js (+25 more)

### Community 15 - "api/package.json"
Cohesion: 0.05
Nodes (37): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+29 more)

### Community 16 - "20260930120000_complete_client_domain.sql"
Cohesion: 0.09
Nodes (26): public.client_assignments, public.client_portal_users, public.client_services, public.clients, public.sync_client_domain_renewal, public.sync_renewal_notification_schedule, client_contracts_sync_renewal, client_domain_audit_client_idx (+18 more)

### Community 17 - "client-domain-api.ts"
Cohesion: 0.08
Nodes (31): ContractCenter(), ContractDetail(), transition(), upload(), empty, money(), sha256(), downloadCsv() (+23 more)

### Community 18 - "client-360.tsx"
Cohesion: 0.10
Nodes (24): ClientPatch, InitialContact, InitialService, Client360(), ClientContracts(), ClientOperations(), ClientRenewals(), ClientTab (+16 more)

### Community 19 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 22 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 23 - "RequireRoles"
Cohesion: 0.05
Nodes (30): RequireRoles(), optionalUuid(), required(), DeliverablesController, deliveryRoles, DeploymentsController, HeadersMap, managerRoles (+22 more)

### Community 24 - "SalesService"
Cohesion: 0.08
Nodes (9): SalesController, Body, Get, Headers, Param, Post, Query, SalesService (+1 more)

### Community 25 - "LeadsService"
Cohesion: 0.13
Nodes (11): LeadsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 26 - "@nestjs/common"
Cohesion: 0.09
Nodes (39): AuditsModule, Module, clientDomainModules, DevelopmentModule, Module, DocumentsModule, Module, emptyDomain() (+31 more)

### Community 27 - "OpportunitiesController"
Cohesion: 0.16
Nodes (9): OpportunitiesController, Body, Controller, Get, Headers, Param, Patch, Post (+1 more)

### Community 28 - "users.module.ts"
Cohesion: 0.18
Nodes (7): RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, Module, UsersModule, packages_contracts_dist_index_roles

### Community 29 - ".index"
Cohesion: 0.50
Nodes (3): HrController, Controller, Get

### Community 30 - "commercial-pipeline.tsx"
Cohesion: 0.15
Nodes (10): CommercialPipeline(), money, stages, fallbackRecords, money, stageLabels, stages, PageHeader() (+2 more)

### Community 31 - "QuotesService"
Cohesion: 0.14
Nodes (5): clip(), date(), money(), QuotesService, Injectable

### Community 32 - "new-client-wizard.tsx"
Cohesion: 0.22
Nodes (9): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, isValidRut(), normalizeRut() (+1 more)

### Community 33 - "renewal-center.tsx"
Cohesion: 0.15
Nodes (17): countdown(), empty, groupItems(), label(), money(), RenewalActions(), RenewalCalendar(), RenewalCard() (+9 more)

### Community 34 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 35 - "crm.controller.ts"
Cohesion: 0.15
Nodes (11): CrmController, Body, Controller, Get, Post, CrmModule, Module, CrmService (+3 more)

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
Cohesion: 0.21
Nodes (8): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode

### Community 40 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, extends, include (+1 more)

### Community 41 - "commercial-workspace.tsx"
Cohesion: 0.08
Nodes (31): sections, sections, ActivityTimeline(), Services(), save(), CatalogItem, Command(), CommercialWorkspace() (+23 more)

### Community 42 - "clients.dto.ts"
Cohesion: 0.42
Nodes (6): optionalUuid(), parsePagination(), validateCreateClient(), isValidChileanRut(), normalizeRut(), packages_contracts_dist_index_clientstatuses

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
Cohesion: 0.20
Nodes (10): actor(), CommercialQuotesController, Body, Controller, Get, Headers, Param, Patch (+2 more)

### Community 48 - ".index"
Cohesion: 0.50
Nodes (3): MonitoringController, Controller, Get

### Community 49 - "contracts.module.ts"
Cohesion: 0.25
Nodes (6): ClientServicesModule, Module, ClientsModule, Module, ContractsModule, Module

### Community 50 - ".index"
Cohesion: 0.50
Nodes (3): PermissionsController, Controller, Get

### Community 51 - ".index"
Cohesion: 0.50
Nodes (3): ProjectsController, Controller, Get

### Community 52 - "packages_contracts_dist_index"
Cohesion: 0.07
Nodes (47): roles, CommercialModule, Module, PageInput, CommercialService, Injectable, pageQuery(), scopedPageQuery() (+39 more)

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

### Community 58 - "ClientsController"
Cohesion: 0.21
Nodes (5): ClientsController, Controller, Get, Param, Query

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
Cohesion: 0.16
Nodes (11): FollowUpsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 97 - "module-page.tsx"
Cohesion: 0.20
Nodes (3): DataTable(), FilterBar(), StatusBadge()

### Community 99 - "CommercialController"
Cohesion: 0.17
Nodes (4): CommercialController, Controller, Get, Query

### Community 102 - ".updatePortal"
Cohesion: 0.21
Nodes (3): Body, Patch, Post

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
Cohesion: 0.18
Nodes (4): page(), cleanSearch(), pageBounds(), page()

### Community 109 - "control-dashboard.tsx"
Cohesion: 0.40
Nodes (3): ControlDashboard(), money, packages_contracts_dist_index_pipelinesummary

### Community 111 - "operations-workspace.tsx"
Cohesion: 0.05
Nodes (41): commercialRoles, managerRoles, OperationsActor, operationsRoles, projectTransitions, taskTransitions, workTransitions, manager (+33 more)

### Community 117 - "ref_vitest"
Cohesion: 0.60
Nodes (3): ref_node_fs, ref_node_path, ref_vitest

### Community 119 - "module-content.ts"
Cohesion: 0.28
Nodes (6): getModuleDescriptor(), groupContent, ModuleDescriptor, enterpriseNavigation, NavigationGroup, NavigationItem

### Community 125 - ".index"
Cohesion: 0.50
Nodes (3): DevelopmentController, Controller, Get

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
- **350 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `name`, `version` (+345 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 673 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `.index`, `ContractsRepository`, `.index`, `client-domain.test.ts`, `ContactsRepository`, `ClientServicesRepository`, `RenewalsRepository`, `SalesService`, `LeadsService`, `@nestjs/common`, `OpportunitiesController`, `users.module.ts`, `.index`, `crm.controller.ts`, `UsersController`, `.index`, `.index`, `actor`, `.index`, `.index`, `.index`, `packages_contracts_dist_index`, `.index`, `.index`, `.index`, `.index`, `ClientsController`, `.index`, `.index`, `FollowUpsService`, `CommercialController`, `.updatePortal`, `.index`, `.index`, `.index`, `.index`, `.index`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `ContractsRepository`, `crm.controller.ts`, `client-domain.test.ts`, `ContactsRepository`, `auth.module.ts`, `ClientServicesRepository`, `clients.dto.ts`, `RenewalsRepository`, `api/package.json`, `operations-workspace.tsx`, `contracts.module.ts`, `client-360.tsx`, `packages_contracts_dist_index`, `RequireRoles`, `users.module.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `CommercialRepository` connect `CommercialRepository` to `CommercialController`, `pageBounds`, `actor`, `packages_contracts_dist_index`, `SalesService`, `LeadsService`, `OpportunitiesController`, `FollowUpsService`, `QuotesService`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ClientsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.12561576354679804 - nodes in this community are weakly interconnected._
- **Should `ContractsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.0526006464883926 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02127659574468085 - nodes in this community are weakly interconnected._
