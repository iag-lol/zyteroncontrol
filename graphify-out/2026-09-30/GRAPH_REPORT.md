# Graph Report - CONTROL ZYTERON  (2026-09-30)

## Corpus Check
- 155 files · ~28,134 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1226 nodes · 2511 edges · 98 communities (69 shown, 29 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 145 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `042c11c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- RequireRoles
- ContractsRepository
- ext_packages_contracts_dist_index_js
- index.ts
- client-domain.test.ts
- ContactsRepository
- renewals.repository.ts
- app.module.ts
- ClientServicesRepository
- packages_contracts_dist_index
- RenewalsService
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_client
- useAccess
- module-page.tsx
- web/package.json
- api/package.json
- 20260930120000_complete_client_domain.sql
- client-domain-api.ts
- client-360.tsx
- 20260930070000_client_360.sql
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_roles
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientstatuses
- package.json
- contact-directory.tsx
- contract-center.tsx
- client-provider-ports.ts
- emptyDomain
- RenewalsRepository
- roles.decorator.ts
- hr.module.ts
- control-dashboard 2.tsx
- clients.dto.ts
- new-client-wizard.tsx
- renewal-center.tsx
- Zyteron Control
- @nestjs/common
- compilerOptions
- compilerOptions
- contracts/package.json
- client-hub.tsx
- compilerOptions
- commercial-pipeline.tsx
- module-content.ts
- compilerOptions
- UsersController
- client-integrations.service.ts
- finance.module.ts
- incidents.module.ts
- monitoring.module.ts
- notifications.module.ts
- permissions.module.ts
- projects.module.ts
- tasks.module.ts
- web_next_types_root_params_d
- reports.module.ts
- roles.module.ts
- security.module.ts
- settings.module.ts
- .list
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
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `RequireRoles()` - 107 edges
2. `@nestjs/common` - 61 edges
3. `emptyDomain()` - 39 edges
4. `ClientsRepository` - 37 edges
5. `useAccess()` - 31 edges
6. `ClientsController` - 26 edges
7. `ClientsService` - 24 edges
8. `ContractsRepository` - 23 edges
9. `ClientServicesRepository` - 22 edges
10. `RenewalsRepository` - 22 edges

## Surprising Connections (you probably didn't know these)
- `ContactCard()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/contact-directory.tsx → apps/web/src/components/access-context.tsx
- `eventService()` --calls--> `ClientsRepository`  [EXTRACTED]
  apps/api/src/client-domain.test.ts → apps/api/src/clients/clients.repository.ts
- `Client360()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `Contacts()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `PortalPanel()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx

## Import Cycles
- None detected.

## Communities (98 total, 29 thin omitted)

### Community 0 - "RequireRoles"
Cohesion: 0.06
Nodes (15): RequireRoles(), clientManagers, clientReaders, ClientsController, Body, Controller, Get, Param (+7 more)

### Community 1 - "ContractsRepository"
Cohesion: 0.07
Nodes (21): ClientContractsController, ContractsController, managers, readers, Body, Controller, Get, Param (+13 more)

### Community 3 - "index.ts"
Cohesion: 0.05
Nodes (42): billingFrequencies, BillingFrequency, Client, ClientContact, ClientContactDirectoryItem, ClientContract, ClientEvent, ClientHealthFactor (+34 more)

### Community 4 - "client-domain.test.ts"
Cohesion: 0.12
Nodes (18): eventService(), ClientEventsService, Injectable, ClientDomainHealthSignals, ClientHealthService, Injectable, ClientIntegrationsService, Injectable (+10 more)

### Community 5 - "ContactsRepository"
Cohesion: 0.07
Nodes (24): ClientsModule, Module, ContactsController, managers, readers, Body, Controller, Get (+16 more)

### Community 6 - "renewals.repository.ts"
Cohesion: 0.19
Nodes (11): ClientRenewalsController, managers, readers, RenewalsController, Controller, RenewalInput, validateRenewal(), RenewalsModule (+3 more)

### Community 7 - "app.module.ts"
Cohesion: 0.17
Nodes (11): AuthController, AuthModule, Controller, Get, Module, Public(), HealthController, Controller (+3 more)

### Community 8 - "ClientServicesRepository"
Cohesion: 0.07
Nodes (27): ClientServicesController, managers, readers, Body, Controller, Get, Param, Patch (+19 more)

### Community 9 - "packages_contracts_dist_index"
Cohesion: 0.18
Nodes (15): ClientPatch, InitialContact, InitialService, apiHeaders(), request(), request(), packages_contracts_dist_index, packages_contracts_dist_index_client (+7 more)

### Community 10 - "RenewalsService"
Cohesion: 0.15
Nodes (6): Body, Param, Patch, Post, RenewalsService, Injectable

### Community 12 - "useAccess"
Cohesion: 0.11
Nodes (17): apps_web_src_app_globals, metadata, AccessContext, AccessContextValue, useAccess(), PermissionGate(), RoleGuard(), DataTable() (+9 more)

### Community 13 - "module-page.tsx"
Cohesion: 0.09
Nodes (3): FilterBar(), StatusBadge(), ModulePage()

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (31): dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js, @zyteron/contracts (+23 more)

### Community 15 - "api/package.json"
Cohesion: 0.05
Nodes (37): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+29 more)

### Community 16 - "20260930120000_complete_client_domain.sql"
Cohesion: 0.09
Nodes (26): public.client_assignments, public.client_portal_users, public.client_services, public.clients, public.sync_client_domain_renewal, public.sync_renewal_notification_schedule, client_contracts_sync_renewal, client_domain_audit_client_idx (+18 more)

### Community 17 - "client-domain-api.ts"
Cohesion: 0.12
Nodes (18): downloadCsv(), empty, money(), ServiceCard(), ServiceDetail(), ServiceForm(), ServiceOperations(), exportCsv() (+10 more)

### Community 18 - "client-360.tsx"
Cohesion: 0.10
Nodes (24): ActivityTimeline(), Client360(), ClientContracts(), ClientRenewals(), ClientTab, Contacts(), formatMoney(), healthLabel() (+16 more)

### Community 19 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 22 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 23 - "contact-directory.tsx"
Cohesion: 0.15
Nodes (10): ContactCard(), ContactDirectory(), ContactForm(), emptySummary, groupItems(), types, contactsDirectoryApi, clientsApi (+2 more)

### Community 24 - "contract-center.tsx"
Cohesion: 0.15
Nodes (10): ContractCenter(), ContractDetail(), transition(), upload(), ContractForm(), ContractVersionLink(), empty, money() (+2 more)

### Community 25 - "client-provider-ports.ts"
Cohesion: 0.18
Nodes (4): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider

### Community 26 - "emptyDomain"
Cohesion: 0.12
Nodes (14): DevelopmentController, DevelopmentModule, Controller, Get, Module, emptyDomain(), QuotesController, QuotesModule (+6 more)

### Community 28 - "roles.decorator.ts"
Cohesion: 0.28
Nodes (5): RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, packages_contracts_dist_index_roles

### Community 29 - "hr.module.ts"
Cohesion: 0.29
Nodes (5): HrController, HrModule, Controller, Get, Module

### Community 30 - "control-dashboard 2.tsx"
Cohesion: 0.16
Nodes (9): fallbackRecords, money, stageLabels, stages, ControlDashboard(), money, packages_contracts_dist_index_commercialrecord, packages_contracts_dist_index_pipelinestage (+1 more)

### Community 31 - "clients.dto.ts"
Cohesion: 0.50
Nodes (6): optionalUuid(), parsePagination(), validateCreateClient(), isValidChileanRut(), normalizeRut(), packages_contracts_dist_index_clientstatuses

### Community 32 - "new-client-wizard.tsx"
Cohesion: 0.24
Nodes (8): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, isValidRut(), normalizeRut()

### Community 33 - "renewal-center.tsx"
Cohesion: 0.15
Nodes (17): countdown(), empty, groupItems(), label(), money(), RenewalActions(), RenewalCalendar(), RenewalCard() (+9 more)

### Community 34 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 35 - "@nestjs/common"
Cohesion: 0.18
Nodes (10): CrmController, Body, Controller, Get, Post, CrmService, Injectable, packages_contracts_dist_index_createcommercialrecord (+2 more)

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
Cohesion: 0.19
Nodes (9): ClientHub(), ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel(), ViewMode (+1 more)

### Community 40 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, extends, include (+1 more)

### Community 41 - "commercial-pipeline.tsx"
Cohesion: 0.28
Nodes (4): CommercialPipeline(), money, stages, PageHeader()

### Community 42 - "module-content.ts"
Cohesion: 0.24
Nodes (7): groupForPath(), getModuleDescriptor(), groupContent, ModuleDescriptor, enterpriseNavigation, NavigationGroup, NavigationItem

### Community 43 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, noUncheckedIndexedAccess, skipLibCheck, strict, target

### Community 44 - "UsersController"
Cohesion: 0.25
Nodes (5): Controller, Get, Injectable, UsersController, UsersDirectoryService

### Community 45 - "client-integrations.service.ts"
Cohesion: 0.11
Nodes (15): AuditsController, AuditsModule, Controller, Get, Module, clientDomainModules, CrmModule, Module (+7 more)

### Community 46 - "finance.module.ts"
Cohesion: 0.29
Nodes (5): FinanceController, FinanceModule, Controller, Get, Module

### Community 47 - "incidents.module.ts"
Cohesion: 0.29
Nodes (5): IncidentsController, IncidentsModule, Controller, Get, Module

### Community 48 - "monitoring.module.ts"
Cohesion: 0.29
Nodes (5): MonitoringController, MonitoringModule, Controller, Get, Module

### Community 49 - "notifications.module.ts"
Cohesion: 0.29
Nodes (5): NotificationsController, NotificationsModule, Controller, Get, Module

### Community 50 - "permissions.module.ts"
Cohesion: 0.29
Nodes (5): PermissionsController, PermissionsModule, Controller, Get, Module

### Community 51 - "projects.module.ts"
Cohesion: 0.29
Nodes (5): ProjectsController, ProjectsModule, Controller, Get, Module

### Community 52 - "tasks.module.ts"
Cohesion: 0.29
Nodes (5): TasksController, TasksModule, Controller, Get, Module

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

## Knowledge Gaps
- **264 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `name`, `version` (+259 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 502 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `ContractsRepository`, `ContactsRepository`, `renewals.repository.ts`, `ClientServicesRepository`, `RenewalsService`, `client-domain-api.ts`, `emptyDomain`, `roles.decorator.ts`, `hr.module.ts`, `@nestjs/common`, `UsersController`, `client-integrations.service.ts`, `finance.module.ts`, `incidents.module.ts`, `monitoring.module.ts`, `notifications.module.ts`, `permissions.module.ts`, `projects.module.ts`, `tasks.module.ts`, `reports.module.ts`, `roles.module.ts`, `security.module.ts`, `settings.module.ts`, `.list`, `vault.module.ts`, `work-orders.module.ts`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `RequireRoles`, `ContractsRepository`, `client-domain.test.ts`, `ContactsRepository`, `renewals.repository.ts`, `app.module.ts`, `ClientServicesRepository`, `packages_contracts_dist_index`, `api/package.json`, `client-domain-api.ts`, `emptyDomain`, `roles.decorator.ts`, `hr.module.ts`, `clients.dto.ts`, `client-integrations.service.ts`, `finance.module.ts`, `incidents.module.ts`, `monitoring.module.ts`, `notifications.module.ts`, `permissions.module.ts`, `projects.module.ts`, `tasks.module.ts`, `reports.module.ts`, `roles.module.ts`, `security.module.ts`, `settings.module.ts`, `vault.module.ts`, `work-orders.module.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `ClientsRepository` connect `RequireRoles` to `packages_contracts_dist_index`, `client-domain.test.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _264 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `RequireRoles` be split into smaller, more focused modules?**
  _Cohesion score 0.06320109439124487 - nodes in this community are weakly interconnected._
- **Should `ContractsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.06716417910447761 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
