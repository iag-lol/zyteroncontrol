# Graph Report - CONTROL ZYTERON  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 619 nodes · 1227 edges · 60 communities (51 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Client API & Policies
- Generic Module UI
- CRM Domain
- Platform Module Registry
- Enterprise Shell & Search
- TypeScript Configuration
- Client Domain Services
- Shared Backend Domains
- Client Cross-Domain Integrations
- Client 360 UI
- Client Onboarding Wizard
- Client Portfolio Hub
- React & Tests
- UI Access Context
- Web Package
- API Bootstrap
- Finance Payment & Signature Ports
- Santiago Date & Time
- API Package
- API Dependencies
- Authentication Guard
- Client Validation & RUT
- Web Dependencies
- Next.js Runtime
- API Commands
- Public Health Endpoint
- Web Development Tools
- Web Commands
- API Development Tools
- Client Permission Policy
- NestJS Configuration
- Audits Backend
- Supabase Authentication
- Development Backend
- Documents Backend
- Finance Backend
- HR Backend
- Incidents Backend
- Monitoring Backend
- Notifications Backend
- Permissions Backend
- Projects Backend
- Quotes Backend
- Reports Backend
- Roles Backend
- Security Backend
- Settings Backend
- Support Backend
- Tasks Backend
- Users Backend
- Secure Vault Backend
- Work Orders Backend
- Next.js Route Types
- Activity Timeline UI
- Client Controller Decorators
- Client Read Endpoints
- Client Request Bodies
- Client Write Endpoints

## God Nodes (most connected - your core abstractions)
1. `RequireRoles()` - 66 edges
2. `emptyDomain()` - 41 edges
3. `@nestjs/common` - 40 edges
4. `ClientsRepository` - 33 edges
5. `ClientsController` - 25 edges
6. `ClientsService` - 23 edges
7. `ModulePage()` - 19 edges
8. `react` - 16 edges
9. `useAccess()` - 13 edges
10. `compilerOptions` - 10 edges

## Surprising Connections (you probably didn't know these)
- `ModulePage()` --calls--> `getModuleDescriptor()`  [EXTRACTED]
  web/src/components/module-page.tsx → web/src/lib/module-content.ts
- `NewClientWizard()` --calls--> `useAccess()`  [EXTRACTED]
  web/src/components/clients/new-client-wizard.tsx → web/src/components/access-context.tsx
- `submit()` --calls--> `normalizeRut()`  [EXTRACTED]
  web/src/components/clients/new-client-wizard.tsx → web/src/lib/rut.ts
- `Review()` --calls--> `normalizeRut()`  [EXTRACTED]
  web/src/components/clients/new-client-wizard.tsx → web/src/lib/rut.ts
- `ClientResults()` --calls--> `formatDate()`  [EXTRACTED]
  web/src/components/clients/client-hub.tsx → web/src/lib/date-time.ts

## Import Cycles
- None detected.

## Communities (60 total, 9 thin omitted)

### Community 0 - "Client API & Policies"
Cohesion: 0.07
Nodes (13): RequireRoles(), ClientsController, Body, Controller, Get, Post, ClientsRepository, Injectable (+5 more)

### Community 1 - "Generic Module UI"
Cohesion: 0.07
Nodes (5): CommercialPipeline(), RoleGuard(), FilterBar(), StatusBadge(), ModulePage()

### Community 2 - "CRM Domain"
Cohesion: 0.08
Nodes (22): CrmController, Body, Controller, Get, Post, CrmService, Injectable, ext_packages_contracts_dist_index_js (+14 more)

### Community 3 - "Platform Module Registry"
Cohesion: 0.07
Nodes (26): AuthModule, Module, ClientsModule, Module, DevelopmentModule, Module, HrModule, Module (+18 more)

### Community 4 - "Enterprise Shell & Search"
Cohesion: 0.11
Nodes (19): lucide-react, ref_node_fs, ref_vitest, users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_role, AccessContext, AccessContextValue, NotificationCenter(), EnterpriseShell() (+11 more)

### Community 5 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (25): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, rootDir, strictPropertyInitialization (+17 more)

### Community 6 - "Client Domain Services"
Cohesion: 0.16
Nodes (16): ClientEventsService, Injectable, ClientHealthService, Injectable, ClientIntegrationsService, Injectable, clientManagers, clientReaders (+8 more)

### Community 8 - "Client Cross-Domain Integrations"
Cohesion: 0.09
Nodes (21): AuditsModule, Module, clientDomainModules, CrmModule, Module, DocumentsModule, Module, FinanceModule (+13 more)

### Community 9 - "Client 360 UI"
Cohesion: 0.15
Nodes (11): ref_supabase_supabase_js, users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientevent, users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientportalsettings, Client360(), ClientTab, healthLabel(), initials(), statusLabel() (+3 more)

### Community 10 - "Client Onboarding Wizard"
Cohesion: 0.21
Nodes (8): initial, NewClientWizard(), submit(), Review(), serviceCatalog, steps, isValidRut(), normalizeRut()

### Community 11 - "Client Portfolio Hub"
Cohesion: 0.21
Nodes (10): users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_client, users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientlistresponse, ClientResults(), emptyResponse, healthLabel(), initials(), metricConfig, statusLabel() (+2 more)

### Community 12 - "React & Tests"
Cohesion: 0.24
Nodes (3): react, DataTable(), EmptyState()

### Community 13 - "UI Access Context"
Cohesion: 0.17
Nodes (6): useAccess(), Contacts(), PortalPanel(), SettingsPanel(), ClientHub(), PermissionGate()

### Community 14 - "Web Package"
Cohesion: 0.18
Nodes (10): @supabase/supabase-js, @types/node, @zyteron/contracts, react-dom, @types/react, @types/react-dom, vitest, name (+2 more)

### Community 15 - "API Bootstrap"
Cohesion: 0.18
Nodes (8): AppModule, Module, dotenv, @nestjs/core, @next/env, ref_node_path, reflect-metadata, nextConfig

### Community 16 - "Finance Payment & Signature Ports"
Cohesion: 0.18
Nodes (4): clientProviderPorts, ElectronicSignatureProvider, PaymentProvider, TaxDocumentProvider

### Community 17 - "Santiago Date & Time"
Cohesion: 0.33
Nodes (9): ActivityTimeline(), Services(), save(), dateFormatter, formatDate(), formatDateTime(), formatTime(), timeFormatter (+1 more)

### Community 18 - "API Package"
Cohesion: 0.20
Nodes (9): typescript, vitest, name, private, type, version, @nestjs/cli, @nestjs/platform-express (+1 more)

### Community 19 - "API Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, reflect-metadata, rxjs, @supabase/supabase-js (+1 more)

### Community 20 - "Authentication Guard"
Cohesion: 0.25
Nodes (5): RoleGuard, Injectable, PUBLIC_ROUTE, REQUIRED_ROLES, users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_roles

### Community 21 - "Client Validation & RUT"
Cohesion: 0.57
Nodes (5): parsePagination(), validateCreateClient(), isValidChileanRut(), normalizeRut(), users_eduardoavila_desktop_zyteron_cl_control_zyteron_packages_contracts_dist_index_clientstatuses

### Community 22 - "Web Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react, next, @next/env, react, react-dom, @supabase/supabase-js, @zyteron/contracts

### Community 23 - "Next.js Runtime"
Cohesion: 0.29
Nodes (3): next, web_src_app_globals, metadata

### Community 24 - "API Commands"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 25 - "Public Health Endpoint"
Cohesion: 0.40
Nodes (4): Public(), HealthController, Controller, Get

### Community 26 - "Web Development Tools"
Cohesion: 0.33
Nodes (6): devDependencies, @types/node, @types/react, @types/react-dom, typescript, vitest

### Community 27 - "Web Commands"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 28 - "API Development Tools"
Cohesion: 0.40
Nodes (5): devDependencies, @nestjs/cli, @types/node, typescript, vitest

### Community 31 - "NestJS Configuration"
Cohesion: 0.50
Nodes (3): collection, $schema, sourceRoot

### Community 32 - "Audits Backend"
Cohesion: 0.50
Nodes (3): AuditsController, Controller, Get

### Community 33 - "Supabase Authentication"
Cohesion: 0.50
Nodes (3): AuthController, Controller, Get

### Community 34 - "Development Backend"
Cohesion: 0.50
Nodes (3): DevelopmentController, Controller, Get

### Community 35 - "Documents Backend"
Cohesion: 0.50
Nodes (3): DocumentsController, Controller, Get

### Community 36 - "Finance Backend"
Cohesion: 0.50
Nodes (3): FinanceController, Controller, Get

### Community 37 - "HR Backend"
Cohesion: 0.50
Nodes (3): HrController, Controller, Get

### Community 38 - "Incidents Backend"
Cohesion: 0.50
Nodes (3): IncidentsController, Controller, Get

### Community 39 - "Monitoring Backend"
Cohesion: 0.50
Nodes (3): MonitoringController, Controller, Get

### Community 40 - "Notifications Backend"
Cohesion: 0.50
Nodes (3): NotificationsController, Controller, Get

### Community 41 - "Permissions Backend"
Cohesion: 0.50
Nodes (3): PermissionsController, Controller, Get

### Community 42 - "Projects Backend"
Cohesion: 0.50
Nodes (3): ProjectsController, Controller, Get

### Community 43 - "Quotes Backend"
Cohesion: 0.50
Nodes (3): QuotesController, Controller, Get

### Community 44 - "Reports Backend"
Cohesion: 0.50
Nodes (3): ReportsController, Controller, Get

### Community 45 - "Roles Backend"
Cohesion: 0.50
Nodes (3): RolesController, Controller, Get

### Community 46 - "Security Backend"
Cohesion: 0.50
Nodes (3): SecurityController, Controller, Get

### Community 47 - "Settings Backend"
Cohesion: 0.50
Nodes (3): SettingsController, Controller, Get

### Community 48 - "Support Backend"
Cohesion: 0.50
Nodes (3): SupportController, Controller, Get

### Community 49 - "Tasks Backend"
Cohesion: 0.50
Nodes (3): TasksController, Controller, Get

### Community 50 - "Users Backend"
Cohesion: 0.50
Nodes (3): Controller, Get, UsersController

### Community 51 - "Secure Vault Backend"
Cohesion: 0.50
Nodes (3): Controller, Get, VaultController

### Community 52 - "Work Orders Backend"
Cohesion: 0.50
Nodes (3): Controller, Get, WorkOrdersController

### Community 53 - "Next.js Route Types"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, web_next_types_root_params_d, web_next_types_routes_d

## Knowledge Gaps
- **106 isolated node(s):** `ViewMode`, `AccessContextValue`, `RoleProfile`, `ModuleDescriptor`, `NavigationGroup` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 267 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RequireRoles()` connect `Client API & Policies` to `CRM Domain`, `Client Domain Services`, `Shared Backend Domains`, `Client Cross-Domain Integrations`, `Audits Backend`, `Development Backend`, `Documents Backend`, `Finance Backend`, `HR Backend`, `Incidents Backend`, `Monitoring Backend`, `Notifications Backend`, `Permissions Backend`, `Projects Backend`, `Quotes Backend`, `Reports Backend`, `Roles Backend`, `Security Backend`, `Settings Backend`, `Support Backend`, `Tasks Backend`, `Users Backend`, `Secure Vault Backend`, `Work Orders Backend`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `Shared Backend Domains` to `CRM Domain`, `Platform Module Registry`, `Client Domain Services`, `Client Cross-Domain Integrations`, `API Package`, `Authentication Guard`, `Client Validation & RUT`, `Public Health Endpoint`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Enterprise Shell & Search` to `Generic Module UI`, `CRM Domain`, `Client 360 UI`, `Client Onboarding Wizard`, `Client Portfolio Hub`, `Web Package`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `ViewMode`, `AccessContextValue`, `RoleProfile` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Client API & Policies` be split into smaller, more focused modules?**
  _Cohesion score 0.0694579681921454 - nodes in this community are weakly interconnected._
- **Should `Generic Module UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06755260243632337 - nodes in this community are weakly interconnected._
- **Should `CRM Domain` be split into smaller, more focused modules?**
  _Cohesion score 0.08108108108108109 - nodes in this community are weakly interconnected._