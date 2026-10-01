# Graph Report - CONTROL ZYTERON  (2026-10-01)

## Corpus Check
- 196 files · ~46,825 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 3, (none) 2, .example 1)

## Summary
- 1953 nodes · 4753 edges · 134 communities (90 shown, 44 thin omitted)
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
- pageBounds
- CommercialRepository
- AuthController
- ClientServicesRepository
- commercial.repository.ts
- RenewalsRepository
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_client
- enterprise-shell.tsx
- ModulePage
- web/package.json
- api/package.json
- 20260930120000_complete_client_domain.sql
- useAccess
- client-360.tsx
- 20260930070000_client_360.sql
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_roles
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientstatuses
- package.json
- RequireRoles
- SalesService
- LeadsService
- @nestjs/common
- OpportunitiesService
- server-supabase.ts
- .index
- control-dashboard 2.tsx
- QuotesService
- new-client-wizard.tsx
- renewal-center.tsx
- Zyteron Control
- packages_contracts_dist_index
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
- contracts.service.ts
- .index
- .index
- commercial.module.ts
- web_next_types_root_params_d
- .index
- .index
- .index
- .index
- quotes.service.ts
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
- OperationsService
- module-page.tsx
- OperationsRepository
- CommercialService
- optionalUuid
- .list
- .index
- .index
- .index
- AGENTS.md
- RenewalsService
- required
- now
- operations-workspace.tsx
- ClientContact
- CommissionsController
- commercial.test.ts
- relationName
- module-content.ts
- dependencies
- commercial-pipeline.tsx
- devDependencies
- scripts
- .index
- HealthController
- .index
- .index
- .index
- next.config.ts

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
- `request()` --calls--> `apiHeaders()`  [EXTRACTED]
  apps/web/src/lib/clients-api.ts → apps/web/src/lib/api-auth.ts
- `eventService()` --calls--> `ClientsRepository`  [EXTRACTED]
  apps/api/src/client-domain.test.ts → apps/api/src/clients/clients.repository.ts
- `Client360()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `ClientOperations()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx

## Import Cycles
- None detected.

## Communities (134 total, 44 thin omitted)

### Community 0 - "ClientsRepository"
Cohesion: 0.06
Nodes (12): ClientsController, Body, Controller, Get, Param, Patch, Post, Query (+4 more)

### Community 1 - "ContractsRepository"
Cohesion: 0.08
Nodes (14): ClientContractsController, ContractsController, Body, Controller, Get, Param, Patch, Post (+6 more)

### Community 3 - "index.ts"
Cohesion: 0.02
Nodes (93): billingFrequencies, BillingFrequency, ChangeRequest, Client, ClientContract, ClientEvent, ClientHealthFactor, ClientHealthStatus (+85 more)

### Community 4 - "client-domain.test.ts"
Cohesion: 0.12
Nodes (19): eventService(), ClientEventsService, Injectable, ClientDomainHealthSignals, ClientHealthService, Injectable, ClientIntegrationsService, Injectable (+11 more)

### Community 5 - "pageBounds"
Cohesion: 0.08
Nodes (16): page(), ContactsController, Body, Controller, Get, Param, Patch, Post (+8 more)

### Community 6 - "CommercialRepository"
Cohesion: 0.09
Nodes (3): CommercialRepository, now(), Injectable

### Community 7 - "AuthController"
Cohesion: 0.50
Nodes (3): AuthController, Controller, Get

### Community 8 - "ClientServicesRepository"
Cohesion: 0.09
Nodes (14): ClientServicesController, Body, Controller, Get, Param, Patch, Post, Query (+6 more)

### Community 9 - "commercial.repository.ts"
Cohesion: 0.21
Nodes (13): PageInput, roles, base(), commercialApi, Page, request(), packages_contracts_dist_index_commercialevent, packages_contracts_dist_index_commission (+5 more)

### Community 10 - "RenewalsRepository"
Cohesion: 0.09
Nodes (11): ClientRenewalsController, RenewalsController, Body, Controller, Get, Param, Patch, Post (+3 more)

### Community 12 - "enterprise-shell.tsx"
Cohesion: 0.11
Nodes (15): apps_web_src_app_globals, metadata, AccessContext, AccessContextValue, PermissionGate(), EmptyState(), NotificationCenter(), EnterpriseShell() (+7 more)

### Community 14 - "web/package.json"
Cohesion: 0.17
Nodes (11): @supabase/supabase-js, @types/node, typescript, vitest, @zyteron/contracts, name, private, version (+3 more)

### Community 15 - "api/package.json"
Cohesion: 0.05
Nodes (36): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+28 more)

### Community 16 - "20260930120000_complete_client_domain.sql"
Cohesion: 0.09
Nodes (26): public.client_assignments, public.client_portal_users, public.client_services, public.clients, public.sync_client_domain_renewal, public.sync_renewal_notification_schedule, client_contracts_sync_renewal, client_domain_audit_client_idx (+18 more)

### Community 17 - "useAccess"
Cohesion: 0.06
Nodes (42): useAccess(), Contacts(), PortalPanel(), ContactCard(), ContactDirectory(), ContactForm(), emptySummary, groupItems() (+34 more)

### Community 18 - "client-360.tsx"
Cohesion: 0.13
Nodes (15): Client360(), ClientContracts(), ClientOperations(), ClientRenewals(), ClientTab, Commercial(), formatMoney(), healthLabel() (+7 more)

### Community 19 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 22 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 23 - "RequireRoles"
Cohesion: 0.11
Nodes (26): RequireRoles(), DeliverablesController, deliveryRoles, DeploymentsController, HeadersMap, managerRoles, MilestonesController, OperationsController (+18 more)

### Community 24 - "SalesService"
Cohesion: 0.12
Nodes (8): HandoffsController, SalesController, SalesGoalsController, Controller, Get, Query, SalesService, Injectable

### Community 25 - "LeadsService"
Cohesion: 0.14
Nodes (11): LeadsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 26 - "@nestjs/common"
Cohesion: 0.08
Nodes (44): AuditsModule, Module, AuthModule, Module, Public(), clientDomainModules, DevelopmentModule, Module (+36 more)

### Community 27 - "OpportunitiesService"
Cohesion: 0.14
Nodes (11): OpportunitiesController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 28 - "server-supabase.ts"
Cohesion: 0.09
Nodes (22): RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, ClientsModule, Module, managers, readers (+14 more)

### Community 29 - ".index"
Cohesion: 0.50
Nodes (3): HrController, Controller, Get

### Community 30 - "control-dashboard 2.tsx"
Cohesion: 0.16
Nodes (9): fallbackRecords, money, stageLabels, stages, ControlDashboard(), money, packages_contracts_dist_index_commercialrecord, packages_contracts_dist_index_pipelinestage (+1 more)

### Community 32 - "new-client-wizard.tsx"
Cohesion: 0.22
Nodes (9): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, clientsApi, isValidRut() (+1 more)

### Community 33 - "renewal-center.tsx"
Cohesion: 0.15
Nodes (17): countdown(), empty, groupItems(), label(), money(), RenewalActions(), RenewalCalendar(), RenewalCard() (+9 more)

### Community 34 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 35 - "packages_contracts_dist_index"
Cohesion: 0.10
Nodes (20): managers, readers, ClientServicesModule, Module, CrmController, Body, Controller, Get (+12 more)

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
Cohesion: 0.15
Nodes (12): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode (+4 more)

### Community 40 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, extends, include (+1 more)

### Community 41 - "commercial-workspace.tsx"
Cohesion: 0.07
Nodes (38): sections, sections, ActivityTimeline(), Services(), save(), CatalogItem, Command(), CommercialWorkspace() (+30 more)

### Community 42 - "clients.dto.ts"
Cohesion: 0.50
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
Cohesion: 0.26
Nodes (9): actor(), CommercialQuotesController, roles, Body, Controller, Headers, Param, Patch (+1 more)

### Community 48 - ".index"
Cohesion: 0.50
Nodes (3): MonitoringController, Controller, Get

### Community 49 - "contracts.service.ts"
Cohesion: 0.09
Nodes (17): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider, managers, readers, validateContract(), ContractsModule (+9 more)

### Community 50 - ".index"
Cohesion: 0.50
Nodes (3): PermissionsController, Controller, Get

### Community 51 - ".index"
Cohesion: 0.50
Nodes (3): ProjectsController, Controller, Get

### Community 52 - "commercial.module.ts"
Cohesion: 0.17
Nodes (13): CommercialModule, Module, pageQuery(), scopedPageQuery(), uuidPattern, roles, readers, roles (+5 more)

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

### Community 58 - "quotes.service.ts"
Cohesion: 0.15
Nodes (13): MailMessage, MailProviderService, Injectable, clip(), date(), escapePdf(), money(), QuoteDocumentService (+5 more)

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
Cohesion: 0.14
Nodes (11): FollowUpsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 96 - "OperationsService"
Cohesion: 0.16
Nodes (3): OperationsPageInput, OperationsService, Injectable

### Community 97 - "module-page.tsx"
Cohesion: 0.21
Nodes (5): RoleGuard(), DataTable(), FilterBar(), StatusBadge(), lucide-react

### Community 99 - "CommercialService"
Cohesion: 0.13
Nodes (8): CommercialController, roles, Controller, Get, Query, CommercialService, Injectable, packages_contracts_dist_index_commercialsummary

### Community 103 - ".index"
Cohesion: 0.50
Nodes (3): DocumentsController, Controller, Get

### Community 104 - ".index"
Cohesion: 0.50
Nodes (3): QuotesController, Controller, Get

### Community 105 - ".index"
Cohesion: 0.50
Nodes (3): SupportController, Controller, Get

### Community 108 - "RenewalsService"
Cohesion: 0.19
Nodes (11): managers, readers, RenewalInput, validateRenewal(), RenewalsModule, Module, RenewalsService, Injectable (+3 more)

### Community 111 - "operations-workspace.tsx"
Cohesion: 0.06
Nodes (32): commercialRoles, managerRoles, operationsRoles, projectTransitions, taskTransitions, workTransitions, emptySummary, OperationsSection (+24 more)

### Community 116 - "CommissionsController"
Cohesion: 0.19
Nodes (5): CommissionsController, Body, Headers, Param, Post

### Community 117 - "commercial.test.ts"
Cohesion: 0.33
Nodes (5): OperationsActor, manager, ref_node_fs, ref_node_path, ref_vitest

### Community 119 - "module-content.ts"
Cohesion: 0.28
Nodes (6): getModuleDescriptor(), groupContent, ModuleDescriptor, enterpriseNavigation, NavigationGroup, NavigationItem

### Community 120 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js, @zyteron/contracts

### Community 122 - "commercial-pipeline.tsx"
Cohesion: 0.33
Nodes (4): CommercialPipeline(), money, stages, PageHeader()

### Community 123 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @types/node, @types/react, @types/react-dom, typescript, vitest

### Community 124 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 125 - ".index"
Cohesion: 0.50
Nodes (3): DevelopmentController, Controller, Get

### Community 126 - "HealthController"
Cohesion: 0.50
Nodes (3): HealthController, Controller, Get

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 670 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `ClientsRepository`, `ContractsRepository`, `.index`, `.index`, `client-domain.test.ts`, `pageBounds`, `ClientServicesRepository`, `commercial.repository.ts`, `RenewalsRepository`, `SalesService`, `LeadsService`, `@nestjs/common`, `OpportunitiesService`, `server-supabase.ts`, `.index`, `packages_contracts_dist_index`, `UsersController`, `.index`, `.index`, `actor`, `.index`, `contracts.service.ts`, `.index`, `.index`, `commercial.module.ts`, `.index`, `.index`, `.index`, `.index`, `.index`, `.index`, `FollowUpsService`, `CommercialService`, `.list`, `.index`, `.index`, `.index`, `RenewalsService`, `CommissionsController`, `.index`, `.index`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `packages_contracts_dist_index`, `client-domain.test.ts`, `CommercialService`, `commercial.repository.ts`, `clients.dto.ts`, `RenewalsService`, `api/package.json`, `actor`, `contracts.service.ts`, `operations-workspace.tsx`, `commercial.module.ts`, `commercial.test.ts`, `RequireRoles`, `quotes.service.ts`, `server-supabase.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `CommercialRepository` connect `CommercialRepository` to `CommercialService`, `pageBounds`, `.list`, `commercial.repository.ts`, `commercial.module.ts`, `CommissionsController`, `commercial.test.ts`, `SalesService`, `LeadsService`, `quotes.service.ts`, `OpportunitiesService`, `QuotesService`, `FollowUpsService`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ClientsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.06142728093947606 - nodes in this community are weakly interconnected._
- **Should `ContractsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02127659574468085 - nodes in this community are weakly interconnected._
