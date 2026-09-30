# Graph Report - CONTROL ZYTERON  (2026-09-30)

## Corpus Check
- 155 files · ~28,036 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1223 nodes · 2503 edges · 95 communities (68 shown, 27 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 143 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c3000e8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- RequireRoles
- ContractsRepository
- ext_packages_contracts_dist_index_js
- index.ts
- clients.module.ts
- client-domain.test.ts
- packages_contracts_dist_index
- @nestjs/common
- client-services.service.ts
- clients-api.ts
- .publish
- users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_client
- react
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
- useAccess
- client-integrations.service.ts
- emptyDomain
- RenewalsRepository
- ClientServicesRepository
- app.module.ts
- control-dashboard 2.tsx
- ContactsRepository
- new-client-wizard.tsx
- renewal-center.tsx
- Zyteron Control
- crm.controller.ts
- compilerOptions
- compilerOptions
- contracts/package.json
- client-hub.tsx
- compilerOptions
- commercial-pipeline.tsx
- module-content.ts
- compilerOptions
- UsersController
- audits.module.ts
- documents.module.ts
- incidents.module.ts
- monitoring.module.ts
- notifications.module.ts
- permissions.module.ts
- projects.module.ts
- quotes.module.ts
- web_next_types_root_params_d
- reports.module.ts
- roles.module.ts
- security.module.ts
- settings.module.ts
- support.module.ts
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

## God Nodes (most connected - your core abstractions)
1. `RequireRoles()` - 106 edges
2. `@nestjs/common` - 61 edges
3. `emptyDomain()` - 39 edges
4. `ClientsRepository` - 36 edges
5. `useAccess()` - 31 edges
6. `ClientsController` - 25 edges
7. `ClientsService` - 23 edges
8. `ContractsRepository` - 23 edges
9. `ClientServicesRepository` - 22 edges
10. `RenewalsRepository` - 22 edges

## Surprising Connections (you probably didn't know these)
- `eventService()` --calls--> `ClientsRepository`  [EXTRACTED]
  apps/api/src/client-domain.test.ts → apps/api/src/clients/clients.repository.ts
- `Client360()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `Services()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-360.tsx → apps/web/src/components/access-context.tsx
- `ClientHub()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/client-hub.tsx → apps/web/src/components/access-context.tsx
- `ContactCard()` --calls--> `useAccess()`  [EXTRACTED]
  apps/web/src/components/clients/contact-directory.tsx → apps/web/src/components/access-context.tsx

## Import Cycles
- None detected.

## Communities (95 total, 27 thin omitted)

### Community 0 - "RequireRoles"
Cohesion: 0.07
Nodes (13): RequireRoles(), ClientsController, Body, Controller, Get, Param, Patch, Post (+5 more)

### Community 1 - "ContractsRepository"
Cohesion: 0.08
Nodes (14): ClientContractsController, ContractsController, Body, Controller, Get, Param, Patch, Post (+6 more)

### Community 3 - "index.ts"
Cohesion: 0.05
Nodes (42): billingFrequencies, BillingFrequency, Client, ClientContact, ClientContactDirectoryItem, ClientContract, ClientEvent, ClientHealthFactor (+34 more)

### Community 4 - "clients.module.ts"
Cohesion: 0.09
Nodes (22): ClientDomainHealthSignals, ClientHealthService, Injectable, ClientIntegrationsService, Injectable, clientManagers, clientReaders, optionalUuid() (+14 more)

### Community 5 - "client-domain.test.ts"
Cohesion: 0.09
Nodes (20): eventService(), ClientEventsService, Injectable, ClientsModule, Module, ContactsController, managers, readers (+12 more)

### Community 6 - "packages_contracts_dist_index"
Cohesion: 0.16
Nodes (17): managers, readers, validateContract(), transitions, cleanSearch(), createServerSupabase(), pageBounds(), packages_contracts_dist_index (+9 more)

### Community 7 - "@nestjs/common"
Cohesion: 0.11
Nodes (17): AuthController, AuthModule, Controller, Get, Module, RoleGuard, Injectable, Public() (+9 more)

### Community 8 - "client-services.service.ts"
Cohesion: 0.10
Nodes (18): ClientServicesController, managers, readers, Body, Controller, Get, Param, Patch (+10 more)

### Community 9 - "clients-api.ts"
Cohesion: 0.20
Nodes (12): ClientPatch, InitialContact, InitialService, apiHeaders(), request(), request(), packages_contracts_dist_index_client, packages_contracts_dist_index_clientcontact (+4 more)

### Community 10 - ".publish"
Cohesion: 0.11
Nodes (16): ClientRenewalsController, managers, readers, RenewalsController, Body, Controller, Get, Param (+8 more)

### Community 12 - "react"
Cohesion: 0.11
Nodes (16): apps_web_src_app_globals, metadata, AccessContext, AccessContextValue, PermissionGate(), DataTable(), EmptyState(), NotificationCenter() (+8 more)

### Community 13 - "module-page.tsx"
Cohesion: 0.08
Nodes (4): RoleGuard(), FilterBar(), StatusBadge(), ModulePage()

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
Cohesion: 0.13
Nodes (20): ActivityTimeline(), Client360(), ClientContracts(), ClientRenewals(), ClientTab, formatMoney(), healthLabel(), initials() (+12 more)

### Community 19 - "20260930070000_client_360.sql"
Cohesion: 0.14
Nodes (25): auth.users, business_event_outbox_pending_idx, client_assignments_user_idx, client_contacts_client_idx, client_contacts_one_primary, client_events_timeline_idx, client_services_client_idx, client_services_renewal_idx (+17 more)

### Community 22 - "package.json"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, globals, typescript-eslint, engines, node, name (+13 more)

### Community 23 - "contact-directory.tsx"
Cohesion: 0.15
Nodes (9): ContactDirectory(), emptySummary, groupItems(), types, contactsDirectoryApi, packages_contracts_dist_index_clientcontactdirectoryitem, packages_contracts_dist_index_contactdirectorysummary, packages_contracts_dist_index_contacttype (+1 more)

### Community 24 - "useAccess"
Cohesion: 0.10
Nodes (12): useAccess(), Contacts(), PortalPanel(), SettingsPanel(), archive(), ContactCard(), ContactForm(), ContractForm() (+4 more)

### Community 25 - "client-integrations.service.ts"
Cohesion: 0.11
Nodes (10): clientDomainModules, clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider, FinanceController, FinanceModule, Controller (+2 more)

### Community 26 - "emptyDomain"
Cohesion: 0.14
Nodes (12): DevelopmentController, Controller, Get, emptyDomain(), HrController, Controller, Get, TasksController (+4 more)

### Community 29 - "app.module.ts"
Cohesion: 0.13
Nodes (14): ClientServicesModule, Module, ContactsModule, Module, ContractsModule, Module, CrmModule, Module (+6 more)

### Community 30 - "control-dashboard 2.tsx"
Cohesion: 0.15
Nodes (10): fallbackRecords, money, stageLabels, stages, ControlDashboard(), money, packages_contracts_dist_index_commercialrecord, packages_contracts_dist_index_pipelinestage (+2 more)

### Community 32 - "new-client-wizard.tsx"
Cohesion: 0.20
Nodes (10): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, clientsApi, isValidRut() (+2 more)

### Community 33 - "renewal-center.tsx"
Cohesion: 0.24
Nodes (13): countdown(), empty, groupItems(), label(), money(), RenewalCalendar(), RenewalCard(), RenewalCenter() (+5 more)

### Community 34 - "Zyteron Control"
Cohesion: 0.13
Nodes (13): ADR-001: primer vertical de Zyteron Control, Contexto, Decisión, Estado, Límites de esta iteración, Próximos hitos, Clientes / Client 360, Estado actual (+5 more)

### Community 35 - "crm.controller.ts"
Cohesion: 0.18
Nodes (8): CrmController, Body, Controller, Get, Post, CrmService, Injectable, packages_contracts_dist_index_createcommercialrecord

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

### Community 41 - "commercial-pipeline.tsx"
Cohesion: 0.28
Nodes (4): CommercialPipeline(), money, stages, PageHeader()

### Community 42 - "module-content.ts"
Cohesion: 0.28
Nodes (6): getModuleDescriptor(), groupContent, ModuleDescriptor, enterpriseNavigation, NavigationGroup, NavigationItem

### Community 43 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, noUncheckedIndexedAccess, skipLibCheck, strict, target

### Community 44 - "UsersController"
Cohesion: 0.25
Nodes (5): Controller, Get, Injectable, UsersController, UsersDirectoryService

### Community 45 - "audits.module.ts"
Cohesion: 0.29
Nodes (5): AuditsController, AuditsModule, Controller, Get, Module

### Community 46 - "documents.module.ts"
Cohesion: 0.29
Nodes (5): DocumentsController, DocumentsModule, Controller, Get, Module

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

### Community 52 - "quotes.module.ts"
Cohesion: 0.29
Nodes (5): QuotesController, QuotesModule, Controller, Get, Module

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

### Community 58 - "support.module.ts"
Cohesion: 0.29
Nodes (5): SupportController, SupportModule, Controller, Get, Module

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
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `RequireRoles` to `ContractsRepository`, `clients.module.ts`, `client-domain.test.ts`, `packages_contracts_dist_index`, `@nestjs/common`, `client-services.service.ts`, `.publish`, `client-integrations.service.ts`, `emptyDomain`, `crm.controller.ts`, `UsersController`, `audits.module.ts`, `documents.module.ts`, `incidents.module.ts`, `monitoring.module.ts`, `notifications.module.ts`, `permissions.module.ts`, `projects.module.ts`, `quotes.module.ts`, `reports.module.ts`, `roles.module.ts`, `security.module.ts`, `settings.module.ts`, `support.module.ts`, `vault.module.ts`, `work-orders.module.ts`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `@nestjs/common` to `clients.module.ts`, `client-domain.test.ts`, `packages_contracts_dist_index`, `client-services.service.ts`, `clients-api.ts`, `.publish`, `api/package.json`, `client-integrations.service.ts`, `emptyDomain`, `app.module.ts`, `control-dashboard 2.tsx`, `crm.controller.ts`, `audits.module.ts`, `documents.module.ts`, `incidents.module.ts`, `monitoring.module.ts`, `notifications.module.ts`, `permissions.module.ts`, `projects.module.ts`, `quotes.module.ts`, `reports.module.ts`, `roles.module.ts`, `security.module.ts`, `settings.module.ts`, `support.module.ts`, `vault.module.ts`, `work-orders.module.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `ClientsRepository` connect `RequireRoles` to `clients-api.ts`, `clients.module.ts`, `client-domain.test.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _264 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `RequireRoles` be split into smaller, more focused modules?**
  _Cohesion score 0.0695970695970696 - nodes in this community are weakly interconnected._
- **Should `ContractsRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._