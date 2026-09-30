"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Client, Role } from "@zyteron/contracts";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
} from "lucide-react";
import { enterpriseNavigation } from "@/lib/navigation";
import { canAccessGroup, roleProfiles } from "@/lib/access-control";
import { AccessContext } from "@/components/access-context";
import { NotificationCenter } from "@/components/enterprise/notification-center";
import { clientsApi } from "@/lib/clients-api";

export function EnterpriseShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set(["control", "commercial"]));
  const [currentRole, setCurrentRole] = useState<Role>("GERENTE_GENERAL");
  const [globalQuery, setGlobalQuery] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);

  const visibleNavigation = useMemo(
    () => enterpriseNavigation
      .filter((group) => canAccessGroup(currentRole, group.id))
      .map((group) => group.id === "security" && currentRole !== "GERENTE_GENERAL"
        ? { ...group, items: group.items.filter((item) => item.href === "/security/vault") }
        : group),
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
    if (globalQuery.trim().length < 2 || !canAccessGroup(currentRole, "clients")) {
      setClientResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      clientsApi.list(currentRole, new URLSearchParams({ search: globalQuery.trim(), pageSize: "5" }))
        .then((response) => setClientResults(response.items))
        .catch(() => setClientResults([]));
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
              <label className="globalSearch"><Search size={16} /><input aria-label="Buscar en Zyteron Control" placeholder="Buscar clientes en la plataforma" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} /></label>
              {clientResults.length ? <div className="globalSearchResults"><small>Clientes</small>{clientResults.map((client) => <Link href={`/clients/${client.id}`} key={client.id} onClick={() => { setGlobalQuery(""); setClientResults([]); }}><span>{(client.tradeName || client.legalName).slice(0, 2).toUpperCase()}</span><div><strong>{client.tradeName || client.legalName}</strong><small>{client.rut} · {client.legalName}</small></div></Link>)}</div> : null}
            </div>
            <button
              className="notificationButton"
              type="button"
              aria-label="Centro de notificaciones"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((value) => !value)}
            ><Bell size={18} /></button>
            {notificationsOpen ? <NotificationCenter /> : null}
            <label className="roleSwitcher">
              <span className="avatar small">{profile.initials}</span>
              <span className="roleSwitcherText"><strong>{profile.userName}</strong><small>{profile.label}</small></span>
              <select aria-label="Cambiar usuario o rol" value={currentRole} onChange={(event) => setCurrentRole(event.target.value as Role)}>
                {roleProfiles.map((item) => <option value={item.role} key={item.role}>{item.label}</option>)}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
        </header>
        <div className="enterpriseContent">{children}</div>
      </div>
    </div>
    </AccessContext.Provider>
  );
}
