# Graph Report - CONTROL ZYTERON  (2026-09-30)

## Corpus Check
- 181 files · ~63,944 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .css 2, .example 1)

## Summary
- 1616 nodes · 3642 edges · 116 communities (77 shown, 39 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 299 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `816e0b08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- RequireRoles
- ContractsRepository
- ext_packages_contracts_dist_index_js
- index.ts
- @nestjs/common
- ContactsRepository
- CommercialRepository
- app.module.ts
- ClientServicesService
- packages_contracts_dist_index
- client-domain.test.ts
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
- useAccess
- SalesService
- LeadsService
- emptyDomain
- OpportunitiesService
- roles.decorator.ts
- hr.module.ts
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
- users.module.ts
- audits.module.ts
- finance.module.ts
- actor
- monitoring.module.ts
- cleanSearch
- permissions.module.ts
- projects.module.ts
- commercial.validation.ts
- web_next_types_root_params_d
- reports.module.ts
- roles.module.ts
- security.module.ts
- settings.module.ts
- quotes.service.ts
- vault.module.ts
- work-orders.module.ts
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
- FollowUpsController
- module-page.tsx
- ClientServicesRepository
- CommercialService
- client-services.controller.ts
- .list
- documents.module.ts
- quotes.module.ts
- support.module.ts
- control-dashboard.tsx
- AGENTS.md
- ClientContact

## God Nodes (most connected - your core abstractions)
1. `RequireRoles()` - 170 edges
2. `@nestjs/common` - 79 edges
3. `CommercialRepository` - 75 edges
4. `actor()` - 39 edges
5. `emptyDomain()` - 39 edges
6. `ClientsRepository` - 37 edges
7. `useAccess()` - 34 edges
8. `formatDate()` - 29 edges
9. `QuotesService` - 27 edges
10. `ClientsController` - 26 edges

## Surprising Connections (you probably didn't know these)
- `save()` --indirect_call--> `date()`  [INFERRED]
  apps/web/src/components/clients/client-360.tsx → apps/api/src/commercial/quote-document.service.ts
- `eventService()` --calls--> `ClientsRepository`  [EXTRACTED]
  apps/api/src/client-domain.test.ts → apps/api/src/clients/clients.repository.ts
- `Client360()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `Commercial()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `Contacts()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx

## Import Cycles
- None detected.

## Communities (116 total, 39 thin omitted)

### Community 0 - "RequireRoles"
Cohesion: 0.07
Nodes (13): RequireRoles(), ClientsController, Body, Controller, Get, Param, Patch, Post (+5 more)

### Community 1 - "ContractsRepository"
Cohesion: 0.06
Nodes (24): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider, ClientContractsController, ContractsController, managers, readers (+16 more)

### Community 3 - "index.ts"
Cohesion: 0.03
Nodes (63): billingFrequencies, BillingFrequency, Client, ClientContract, ClientEvent, ClientHealthFactor, ClientHealthStatus, clientHealthStatuses (+55 more)

### Community 4 - "@nestjs/common"
Cohesion: 0.14
Nodes (15): ClientDomainHealthSignals, ClientHealthService, Injectable, clientDomainModules, ClientIntegrationsService, Injectable, clientManagers, clientReaders (+7 more)

### Community 5 - "ContactsRepository"
Cohesion: 0.09
Nodes (18): ContactsController, managers, readers, Body, Controller, Get, Param, Patch (+10 more)

### Community 6 - "CommercialRepository"
Cohesion: 0.08
Nodes (3): CommercialRepository, now(), Injectable

### Community 7 - "app.module.ts"
Cohesion: 0.10
Nodes (19): AuthController, AuthModule, Controller, Get, Module, Public(), ClientServicesModule, Module (+11 more)

### Community 8 - "ClientServicesService"
Cohesion: 0.11
Nodes (10): ClientServicesController, Body, Controller, Get, Param, Patch, Post, Query (+2 more)

### Community 9 - "packages_contracts_dist_index"
Cohesion: 0.17
Nodes (18): PageInput, roles, roles, SalesGoalsController, base(), Page, request(), packages_contracts_dist_index (+10 more)

### Community 10 - "client-domain.test.ts"
Cohesion: 0.07
Nodes (24): eventService(), ClientEventsService, Injectable, clientPermissions, ClientRenewalsController, managers, readers, RenewalsController (+16 more)

### Community 12 - "enterprise-shell.tsx"
Cohesion: 0.11
Nodes (14): apps_web_src_app_globals, metadata, AccessContext, AccessContextValue, PermissionGate(), RoleGuard(), DataTable(), EmptyState() (+6 more)

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
Cohesion: 0.10
Nodes (26): ContractCenter(), ContractDetail(), transition(), upload(), empty, money(), sha256(), downloadCsv() (+18 more)

### Community 18 - "client-360.tsx"
Cohesion: 0.09
Nodes (27): ClientPatch, InitialContact, InitialService, Client360(), ClientContracts(), ClientRenewals(), ClientTab, Commercial() (+19 more)

### Community 19 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 22 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 23 - "useAccess"
Cohesion: 0.11
Nodes (13): useAccess(), PortalPanel(), SettingsPanel(), archive(), ContactCard(), ContactDirectory(), ContactForm(), emptySummary (+5 more)

### Community 24 - "SalesService"
Cohesion: 0.08
Nodes (12): CommissionsController, HandoffsController, SalesController, Body, Controller, Get, Headers, Param (+4 more)

### Community 25 - "LeadsService"
Cohesion: 0.13
Nodes (11): LeadsController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 26 - "emptyDomain"
Cohesion: 0.09
Nodes (21): DevelopmentController, DevelopmentModule, Controller, Get, Module, emptyDomain(), IncidentsController, IncidentsModule (+13 more)

### Community 27 - "OpportunitiesService"
Cohesion: 0.14
Nodes (11): OpportunitiesController, Body, Controller, Get, Headers, Param, Patch, Post (+3 more)

### Community 28 - "roles.decorator.ts"
Cohesion: 0.22
Nodes (6): RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, roles, packages_contracts_dist_index_roles

### Community 29 - "hr.module.ts"
Cohesion: 0.29
Nodes (5): HrController, HrModule, Controller, Get, Module

### Community 30 - "commercial-pipeline.tsx"
Cohesion: 0.15
Nodes (10): CommercialPipeline(), money, stages, fallbackRecords, money, stageLabels, stages, PageHeader() (+2 more)

### Community 32 - "new-client-wizard.tsx"
Cohesion: 0.20
Nodes (10): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, clientsApi, isValidRut() (+2 more)

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
Cohesion: 0.16
Nodes (9): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode (+1 more)

### Community 40 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, extends, include (+1 more)

### Community 41 - "commercial-workspace.tsx"
Cohesion: 0.08
Nodes (27): sections, sections, ActivityTimeline(), Services(), save(), CatalogItem, Command(), CommercialWorkspace() (+19 more)

### Community 42 - "clients.dto.ts"
Cohesion: 0.11
Nodes (19): optionalUuid(), parsePagination(), validateCreateClient(), isValidChileanRut(), normalizeRut(), accessByRole, groupForPath(), RoleProfile (+11 more)

### Community 43 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, noUncheckedIndexedAccess, skipLibCheck, strict, target

### Community 44 - "users.module.ts"
Cohesion: 0.20
Nodes (7): Controller, Get, Injectable, Module, UsersController, UsersDirectoryService, UsersModule

### Community 45 - "audits.module.ts"
Cohesion: 0.29
Nodes (5): AuditsController, AuditsModule, Controller, Get, Module

### Community 46 - "finance.module.ts"
Cohesion: 0.29
Nodes (5): FinanceController, FinanceModule, Controller, Get, Module

### Community 47 - "actor"
Cohesion: 0.31
Nodes (8): actor(), CommercialQuotesController, Body, Controller, Headers, Param, Patch, Post

### Community 48 - "monitoring.module.ts"
Cohesion: 0.29
Nodes (5): MonitoringController, MonitoringModule, Controller, Get, Module

### Community 49 - "cleanSearch"
Cohesion: 0.21
Nodes (9): page(), cleanSearch(), createServerSupabase(), pageBounds(), pagination(), packages_contracts_dist_index_contactmutationresult, packages_contracts_dist_index_contractversion, packages_contracts_dist_index_servicecatalogitem (+1 more)

### Community 50 - "permissions.module.ts"
Cohesion: 0.29
Nodes (5): PermissionsController, PermissionsModule, Controller, Get, Module

### Community 51 - "projects.module.ts"
Cohesion: 0.29
Nodes (5): ProjectsController, ProjectsModule, Controller, Get, Module

### Community 52 - "commercial.validation.ts"
Cohesion: 0.16
Nodes (14): optionalUuid(), pageQuery(), required(), scopedPageQuery(), uuidPattern, roles, FollowUpsService, Injectable (+6 more)

### Community 54 - "reports.module.ts"
Cohesion: 0.29
Nodes (5): ReportsController, ReportsModule, Controller, Get, Module

### Community 55 - "roles.module.ts"
Cohesion: 0.29
Nodes (5): RolesController, RolesModule, Controller, Get, Module

### Community 56 - "security.module.ts"
Cohesion: 0.29
Nodes (5): SecurityController, SecurityModule, Controller, Get, Module

### Community 57 - "settings.module.ts"
Cohesion: 0.29
Nodes (5): SettingsController, SettingsModule, Controller, Get, Module

### Community 58 - "quotes.service.ts"
Cohesion: 0.17
Nodes (12): MailMessage, MailProviderService, Injectable, clip(), date(), escapePdf(), money(), QuoteDocumentService (+4 more)

### Community 59 - "vault.module.ts"
Cohesion: 0.29
Nodes (5): Controller, Get, Module, VaultController, VaultModule

### Community 60 - "work-orders.module.ts"
Cohesion: 0.29
Nodes (5): Controller, Get, Module, WorkOrdersController, WorkOrdersModule

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

### Community 95 - "FollowUpsController"
Cohesion: 0.17
Nodes (9): FollowUpsController, Body, Controller, Get, Headers, Param, Patch, Post (+1 more)

### Community 98 - "ClientServicesRepository"
Cohesion: 0.24
Nodes (3): ClientServiceInput, ClientServicesRepository, Injectable

### Community 99 - "CommercialService"
Cohesion: 0.16
Nodes (6): CommercialController, Controller, Get, Query, CommercialService, Injectable

### Community 101 - "client-services.controller.ts"
Cohesion: 0.20
Nodes (7): managers, readers, validateClientService(), packages_contracts_dist_index_billingfrequencies, packages_contracts_dist_index_billingfrequency, packages_contracts_dist_index_clientservicestatus, packages_contracts_dist_index_clientservicestatuses

### Community 103 - "documents.module.ts"
Cohesion: 0.29
Nodes (5): DocumentsController, DocumentsModule, Controller, Get, Module

### Community 104 - "quotes.module.ts"
Cohesion: 0.29
Nodes (5): QuotesController, QuotesModule, Controller, Get, Module

### Community 105 - "support.module.ts"
Cohesion: 0.29
Nodes (5): SupportController, SupportModule, Controller, Get, Module

### Community 106 - "control-dashboard.tsx"
Cohesion: 0.40
Nodes (3): ControlDashboard(), money, packages_contracts_dist_index_commercialrecord

## Knowledge Gaps
- **304 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `name`, `version` (+299 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 593 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `ContractsRepository`, `@nestjs/common`, `ContactsRepository`, `ClientServicesService`, `packages_contracts_dist_index`, `client-domain.test.ts`, `SalesService`, `LeadsService`, `emptyDomain`, `OpportunitiesService`, `roles.decorator.ts`, `hr.module.ts`, `crm.controller.ts`, `users.module.ts`, `audits.module.ts`, `finance.module.ts`, `actor`, `monitoring.module.ts`, `permissions.module.ts`, `projects.module.ts`, `commercial.validation.ts`, `reports.module.ts`, `roles.module.ts`, `security.module.ts`, `settings.module.ts`, `vault.module.ts`, `work-orders.module.ts`, `FollowUpsController`, `ClientServicesRepository`, `CommercialService`, `client-services.controller.ts`, `.list`, `documents.module.ts`, `quotes.module.ts`, `support.module.ts`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `ContractsRepository`, `ContactsRepository`, `app.module.ts`, `packages_contracts_dist_index`, `client-domain.test.ts`, `api/package.json`, `client-360.tsx`, `emptyDomain`, `roles.decorator.ts`, `hr.module.ts`, `crm.controller.ts`, `clients.dto.ts`, `users.module.ts`, `audits.module.ts`, `finance.module.ts`, `monitoring.module.ts`, `cleanSearch`, `permissions.module.ts`, `projects.module.ts`, `commercial.validation.ts`, `reports.module.ts`, `roles.module.ts`, `security.module.ts`, `settings.module.ts`, `quotes.service.ts`, `vault.module.ts`, `work-orders.module.ts`, `client-services.controller.ts`, `documents.module.ts`, `quotes.module.ts`, `support.module.ts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `CommercialRepository` connect `CommercialRepository` to `CommercialService`, `.list`, `packages_contracts_dist_index`, `cleanSearch`, `commercial.validation.ts`, `SalesService`, `LeadsService`, `quotes.service.ts`, `OpportunitiesService`, `QuotesService`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _304 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `RequireRoles` be split into smaller, more focused modules?**
  _Cohesion score 0.06775067750677506 - nodes in this community are weakly interconnected._
- **Should `ContractsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.05627705627705628 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._