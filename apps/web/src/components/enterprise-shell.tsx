"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { AuditFinding, AuditRun, Client, Role, SupportTicket } from "@zyteron/contracts";
import { roles } from "@zyteron/contracts";
import type { Session } from "@supabase/supabase-js";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
} from "lucide-react";
import { enterpriseNavigation } from "@/lib/navigation";
import { canAccessGroup, roleProfiles } from "@/lib/access-control";
import { canSeeFinancePath } from "@/lib/finance-format";
import { AccessContext } from "@/components/access-context";
import { NotificationCenter } from "@/components/enterprise/notification-center";
import { clientsApi } from "@/lib/clients-api";
import { commercialApi } from "@/lib/commercial-api";
import type { Sale, SalesLead, SalesOpportunity, SalesQuote } from "@zyteron/contracts";
import { auditsApi } from "@/lib/audits-api";
import { supportApi } from "@/lib/support-api";
import { AuthScreen, PasswordRecoveryScreen } from "@/components/auth-screen";
import { browserSupabase,developmentAuth } from "@/lib/auth-client";

export function EnterpriseShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set(["control", "commercial"]));
  const [currentRole, setCurrentRole] = useState<Role>("GERENTE_GENERAL");
  const [authReady,setAuthReady]=useState(false);
  const [authenticated,setAuthenticated]=useState(false);
  const [passwordRecovery,setPasswordRecovery]=useState(false);
  const [authError,setAuthError]=useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [commercialResults, setCommercialResults] = useState<{leads:SalesLead[];opportunities:SalesOpportunity[];quotes:SalesQuote[];sales:Sale[]}>({leads:[],opportunities:[],quotes:[],sales:[]});
  const [auditResults,setAuditResults]=useState<{audits:AuditRun[];findings:AuditFinding[]}>({audits:[],findings:[]});
  const [supportResults,setSupportResults]=useState<SupportTicket[]>([]);
  const isDevelopment=developmentAuth();

  useEffect(()=>{
    if(isDevelopment){const configured=process.env.NEXT_PUBLIC_DEV_ROLE;setCurrentRole(roles.includes(configured as Role)?configured as Role:"GERENTE_GENERAL");setAuthenticated(true);setAuthReady(true);return;}
    const client=browserSupabase();if(!client){setAuthError("El acceso empresarial no está disponible en este momento.");setAuthReady(true);return;}
    const apply=(session:Session|null)=>{const value=session?.user?.app_metadata?.role;if(session&&roles.includes(value as Role)){setCurrentRole(value as Role);setAuthenticated(true);setAuthError("");}else{setAuthenticated(false);if(session)setAuthError("Tu cuenta no tiene acceso habilitado. Contacta al administrador.");}setAuthReady(true);};
    void client.auth.getSession().then(({data})=>apply(data.session));const{data:listener}=client.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY")setPasswordRecovery(true);apply(session);});return()=>listener.subscription.unsubscribe();
  },[isDevelopment]);

  const visibleNavigation = useMemo(
    () => enterpriseNavigation
      .filter((group) => canAccessGroup(currentRole, group.id))
      .map((group) => group.id === "security" && !["GERENTE_GENERAL","SECURITY_ADMIN"].includes(currentRole)
        ? { ...group, items: group.items.filter((item) => item.href === "/security/vault") }
        : group.id === "finance" ? { ...group, items: group.items.filter((item) => canSeeFinancePath(currentRole, item.href)) } : group),
    [currentRole],
  );
  const profile = roleProfiles.find((item) => item.role === currentRole) ?? roleProfiles[0]!;

  const activeItem = useMemo(
    () => visibleNavigation.flatMap((group) => group.items)
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => item.href === "/dashboard" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(item.href)),
    [pathname, visibleNavigation],
  );

  useEffect(() => {
    if (globalQuery.trim().length < 2 || (!canAccessGroup(currentRole, "clients") && !canAccessGroup(currentRole, "commercial") && !canAccessGroup(currentRole,"audits") && !canAccessGroup(currentRole,"support"))) {
      setClientResults([]); setCommercialResults({leads:[],opportunities:[],quotes:[],sales:[]});
      setAuditResults({audits:[],findings:[]});
      setSupportResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void Promise.all([
        canAccessGroup(currentRole,"clients") ? clientsApi.list(currentRole,new URLSearchParams({search:globalQuery.trim(),pageSize:"5"})) : Promise.resolve({items:[]}),
        canAccessGroup(currentRole,"commercial") ? commercialApi.search(currentRole,globalQuery.trim()) : Promise.resolve({leads:[],opportunities:[],quotes:[],sales:[]}),
        canAccessGroup(currentRole,"audits") ? auditsApi.search(currentRole,globalQuery.trim()) : Promise.resolve({audits:[],findings:[]}),
        canAccessGroup(currentRole,"support") ? supportApi.search(currentRole,globalQuery.trim()) : Promise.resolve([]),
      ]).then(([clients,commercial,audits,support])=>{setClientResults(clients.items as Client[]);setCommercialResults(commercial);setAuditResults(audits);setSupportResults(support);}).catch(()=>{setClientResults([]);setCommercialResults({leads:[],opportunities:[],quotes:[],sales:[]});setAuditResults({audits:[],findings:[]});setSupportResults([]);});
    }, 280);
    return () => window.clearTimeout(timer);
  }, [currentRole, globalQuery]);

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  // Portal de pago público (link con token): sin navegación interna ni datos de la sesión.
  if (pathname.startsWith("/payments/")) return <>{children}</>;
  if(!authReady)return <main className="authBoot"><ShieldCheck/><span>Verificando sesión…</span></main>;
  if(passwordRecovery)return <PasswordRecoveryScreen onComplete={()=>setPasswordRecovery(false)}/>;
  if(!authenticated)return <AuthScreen configurationError={authError}/>;

  return (
    <AccessContext.Provider value={{ role: currentRole }}>
    <div className={`enterpriseShell ${collapsed ? "isCollapsed" : ""}`}>
      {mobileOpen ? <button className="mobileScrim" aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`enterpriseSidebar ${mobileOpen ? "mobileOpen" : ""}`}>
        <div className="sidebarBrandRow">
          <Link className="brand" href="/dashboard" onClick={() => setMobileOpen(false)}>
            <span className="brandMark">Z</span>
            {!collapsed ? <span className="brandCopy"><strong>Zyteron</strong><small>Control</small></span> : null}
          </Link>
          <button className="collapseButton" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expandir navegación" : "Colapsar navegación"}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="enterpriseNav" aria-label="Módulos de Zyteron Control">
          {visibleNavigation.map((group) => {
            const Icon = group.icon;
            const isOpen = openGroups.has(group.id);
            const hasActiveItem = group.items.some((item) => item.href === activeItem?.href);
            return (
              <section className={`navGroup ${hasActiveItem ? "hasActive" : ""}`} key={group.id}>
                <button className="navGroupButton" type="button" title={collapsed ? group.label : undefined} onClick={() => toggleGroup(group.id)}>
                  <Icon size={17} strokeWidth={1.8} />
                  {!collapsed ? <><span>{group.label}</span><ChevronDown className={isOpen ? "rotated" : ""} size={14} /></> : null}
                </button>
                {!collapsed && isOpen ? (
                  <div className="navSubmenu">
                    {group.items.map((item) => {
                      const active = item.href === activeItem?.href;
                      return (
                        <Link className={active ? "active" : ""} href={item.href} prefetch={false} key={item.href} onClick={() => setMobileOpen(false)}>
                          <span>{item.label}</span>
                          {item.badge ? <b>{item.badge}</b> : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>

        <div className="sidebarIdentity">
          <span className="avatar">{profile.initials}</span>
          {!collapsed ? <span><strong>{profile.userName}</strong><small>{profile.label}</small></span> : null}
        </div>
      </aside>

      <div className="enterpriseWorkspace">
        <header className="enterpriseTopbar">
          <div className="topbarContext">
            <button className="mobileMenuButton" type="button" aria-label="Abrir navegación" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <div><p>Zyteron Control</p><strong>{activeItem?.label ?? "Resumen ejecutivo"}</strong></div>
          </div>
          <div className="topbarActions">
            <div className="globalSearchWrap">
              <label className="globalSearch"><Search size={16} /><input aria-label="Buscar en Zyteron Control" placeholder="Buscar clientes, SUP, AUD o FND" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} /></label>
              {clientResults.length+commercialResults.leads.length+commercialResults.opportunities.length+commercialResults.quotes.length+commercialResults.sales.length+auditResults.audits.length+auditResults.findings.length+supportResults.length ? <div className="globalSearchResults"><small>Resultados</small>{clientResults.map((client) => <Link href={`/clients/${client.id}`} key={client.id} onClick={() => setGlobalQuery("")}><span>CL</span><div><strong>{client.tradeName || client.legalName}</strong><small>{client.rut}</small></div></Link>)}{supportResults.map(item=><Link href={`/support/inbox/${item.id}`} key={item.id} onClick={()=>setGlobalQuery("")}><span>SP</span><div><strong>{item.ticketNumber}</strong><small>{item.subject}</small></div></Link>)}{auditResults.audits.map(item=><Link href={`/audits/${item.id}`} key={item.id} onClick={()=>setGlobalQuery("")}><span>AU</span><div><strong>{item.auditNumber}</strong><small>{item.clientName||item.auditType}</small></div></Link>)}{auditResults.findings.map(item=><Link href={`/audits/${item.auditId}`} key={item.id} onClick={()=>setGlobalQuery("")}><span>FN</span><div><strong>{item.findingNumber}</strong><small>{item.title}</small></div></Link>)}{commercialResults.leads.map((item)=><Link href="/commercial/leads" key={item.id} onClick={()=>setGlobalQuery("")}><span>LD</span><div><strong>{item.companyName}</strong><small>{item.contactName}</small></div></Link>)}{commercialResults.opportunities.map((item)=><Link href="/commercial/opportunities" key={item.id} onClick={()=>setGlobalQuery("")}><span>OP</span><div><strong>{item.company}</strong><small>{item.name}</small></div></Link>)}{commercialResults.quotes.map((item)=><Link href="/commercial/quotes" key={item.id} onClick={()=>setGlobalQuery("")}><span>CT</span><div><strong>{item.quoteNumber}</strong><small>{item.companyName}</small></div></Link>)}{commercialResults.sales.map((item)=><Link href="/commercial/sales" key={item.id} onClick={()=>setGlobalQuery("")}><span>VT</span><div><strong>{item.amount.toLocaleString("es-CL")} {item.currency}</strong><small>Venta {item.id.slice(0,8)}</small></div></Link>)}</div> : null}
            </div>
            <button
              className="notificationButton"
              type="button"
              aria-label="Centro de notificaciones"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((value) => !value)}
            ><Bell size={18} /></button>
            {notificationsOpen ? <NotificationCenter /> : null}
            {isDevelopment?<label className="roleSwitcher">
              <span className="avatar small">{profile.initials}</span>
              <span className="roleSwitcherText"><strong>{profile.userName}</strong><small>{profile.label}</small></span>
              <select aria-label="Cambiar usuario o rol" value={currentRole} onChange={(event) => setCurrentRole(event.target.value as Role)}>
                {roleProfiles.map((item) => <option value={item.role} key={item.role}>{item.label}</option>)}
              </select>
              <ChevronDown size={14} />
            </label>:<div className="roleSwitcher authenticatedRole"><span className="avatar small">{profile.initials}</span><span className="roleSwitcherText"><strong>{profile.userName}</strong><small>{profile.label}</small></span><button type="button" aria-label="Cerrar sesión" onClick={()=>void browserSupabase()?.auth.signOut()}><LogOut size={15}/></button></div>}
          </div>
        </header>
        <div className="enterpriseContent">{children}</div>
      </div>
    </div>
    </AccessContext.Provider>
  );
}
