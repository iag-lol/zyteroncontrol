"use client";

import { useMemo, useState } from "react";
import type { AccountingRule, AmountKey, LedgerAccount, RuleLineTemplate } from "@zyteron/contracts";
import { ArrowRight, CheckCircle2, Clock3, Layers, Scale, Search, ShieldCheck } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { financeApi } from "@/lib/finance-api";
import { label, moment } from "@/lib/finance-format";
import { Drawer, Empty, Feedback, LoadError, Loading, useLoad } from "./fx-ui";

type RuleState = "ACTIVE" | "DRAFT" | "INACTIVE";
const stateLabels: Record<RuleState, string> = { ACTIVE: "Activa", DRAFT: "Por revisar", INACTIVE: "Inactiva" };
const versionLabels = { DRAFT: "Borrador", ACTIVE: "Activa", RETIRED: "Retirada" };
const eventLabels: Record<string, string> = {
  INVOICE_ISSUED: "Factura o nota de débito aceptada", CREDIT_NOTE_ISSUED: "Nota de crédito aceptada",
  EXPENSE_APPROVED: "Gasto aprobado", COMMISSION_APPROVED: "Comisión aprobada", COMMISSION_PAID: "Comisión pagada",
  PAYMENT_RECEIVED_BANK: "Cobro recibido en banco", PAYMENT_RECEIVED_CASH: "Cobro recibido en caja",
  PAYMENT_RECEIVED_PROVIDER: "Cobro recibido por pasarela", PAYMENT_ALLOCATED: "Cobro aplicado a factura",
  PAYMENT_RECEIVED: "Cobro recibido", PAYMENT_ALLOCATION_REVERSED: "Aplicación de cobro revertida",
  PAYMENT_ALLOCATION_REVERTED: "Aplicación de cobro revertida", PAYMENT_REFUNDED: "Cobro devuelto",
  PROVIDER_PAYOUT: "Liquidación de pasarela", VENDOR_PAYMENT_EXECUTED: "Pago a proveedor",
};
const amountLabels: Record<AmountKey, string> = {
  TOTAL: "Total", NET: "Neto", EXEMPT: "Exento", TAX: "Impuesto", GROSS: "Bruto", FEE: "Comisión",
  NET_SETTLEMENT: "Liquidación neta", AMOUNT: "Monto", TAX_ELIGIBLE: "Impuesto recuperable", TAX_NON_ELIGIBLE: "Impuesto no recuperable",
};
const contextLabels: Record<string, string> = {
  revenueAccountId: "Cuenta de ingresos del servicio", cashLedgerAccountId: "Cuenta de caja o banco", expenseAccountId: "Cuenta de gasto",
};
const dimensionLabels = { client: "Cliente", project: "Proyecto", service: "Servicio", costCenter: "Centro de costo" };
const channelLabels: Record<string, string> = { BANK: "Banco", CASH: "Efectivo", PROVIDER: "Pasarela", TRANSFER: "Transferencia", CARD: "Tarjeta" };
const filterLabels: Record<string, string> = { channel: "Canal", provider: "Pasarela", currency: "Moneda" };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const versionsFor = (rule: AccountingRule) => {
  const versions = [...(rule.versions ?? [])].sort((a, b) => b.version - a.version);
  const active = versions.find((version) => version.status === "ACTIVE");
  const draft = versions.find((version) => version.status === "DRAFT");
  return { versions, active, draft, shown: active ?? draft ?? versions[0] };
};
const stateFor = (rule: AccountingRule): RuleState => rule.active ? "ACTIVE" : versionsFor(rule).draft ? "DRAFT" : "INACTIVE";
const eventFor = (rule: AccountingRule) => eventLabels[rule.eventType] ?? label(rule.eventType);
const filtersFor = (rule: AccountingRule) => Object.entries(rule.filters ?? {}).map(([key, value]) => `${filterLabels[key] ?? label(key)}: ${channelLabels[value] ?? value}`);

interface Props {
  rules: AccountingRule[] | null | undefined;
  error: string;
  retry: () => void;
  canManage: boolean;
  busy: boolean;
  actionError: string;
  notice: string;
  activate: (versionId: string, ruleName: string) => Promise<unknown>;
  deactivate: (ruleId: string) => Promise<unknown>;
}

function RuleBadge({ state }: { state: RuleState }) {
  return <span className={`fx-ar-badge ${state.toLowerCase()}`}><i/>{stateLabels[state]}</span>;
}

function AccountReference({ line, accounts }: { line: RuleLineTemplate; accounts: LedgerAccount[] }) {
  const code = line.account.code ?? line.account.fallbackCode;
  const account = accounts.find((item) => item.code === code);
  return <div className="fx-ar-account">
    {line.account.context ? <><strong>{contextLabels[line.account.context] ?? "Cuenta indicada por el evento"}</strong><small>Alternativa: <code>{code ?? "Sin definir"}</code>{account ? ` · ${account.name}` : ""}</small></>
      : <><code>{code ?? "Sin definir"}</code>{account ? <span>{account.name}</span> : null}</>}
  </div>;
}

export function AccountingRules({ rules, error, retry, canManage, busy, actionError, notice, activate, deactivate }: Props) {
  const { role } = useAccess();
  const accounts = useLoad(() => financeApi.get<LedgerAccount[]>(role, "/accounts"), [role]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RuleState | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const counts = useMemo(() => ({
    total: rules?.length ?? 0,
    active: rules?.filter((rule) => stateFor(rule) === "ACTIVE").length ?? 0,
    draft: rules?.filter((rule) => stateFor(rule) === "DRAFT").length ?? 0,
    inactive: rules?.filter((rule) => stateFor(rule) === "INACTIVE").length ?? 0,
  }), [rules]);
  const filtered = useMemo(() => (rules ?? []).filter((rule) => {
    if (filter !== "ALL" && stateFor(rule) !== filter) return false;
    const accountText = versionsFor(rule).shown?.lines.map((line) => {
      const code = line.account.code ?? line.account.fallbackCode;
      return `${code ?? ""} ${accounts.data?.find((item) => item.code === code)?.name ?? ""}`;
    }).join(" ") ?? "";
    return normalize(`${rule.name} ${rule.code} ${rule.description ?? ""} ${rule.eventType} ${eventFor(rule)} ${accountText} ${filtersFor(rule).join(" ")}`).includes(normalize(search.trim()));
  }), [rules, filter, search, accounts.data]);
  const selected = rules?.find((rule) => rule.id === selectedId);
  const selectedVersions = selected ? versionsFor(selected) : undefined;
  const shown = selectedVersions?.shown;
  const tabs: Array<[RuleState | "ALL", string, number]> = [["ALL", "Todas", counts.total], ["DRAFT", "Por revisar", counts.draft], ["ACTIVE", "Activas", counts.active], ["INACTIVE", "Inactivas", counts.inactive]];

  if (error) return <LoadError error={error} retry={retry}/>;
  if (!rules) return <Loading text="Cargando reglas contables…"/>;
  return <div className="fx-accounting-rules">
    <div className="fx-ar-summary" aria-label="Resumen de reglas contables">
      <div><Layers size={18}/><span>Total de reglas</span><strong>{counts.total}</strong><small>Configuraciones del motor contable</small></div>
      <div className="draft"><Clock3 size={18}/><span>Por revisar</span><strong>{counts.draft}</strong><small>Versiones en borrador</small></div>
      <div className="active"><CheckCircle2 size={18}/><span>Activas</span><strong>{counts.active}</strong><small>Disponibles para generar asientos</small></div>
      <div><ShieldCheck size={18}/><span>Inactivas</span><strong>{counts.inactive}</strong><small>Reglas fuera de uso</small></div>
    </div>
    <div className="fx-ar-toolbar">
      <label className="fx-ar-search"><Search size={16}/><input aria-label="Buscar reglas contables" placeholder="Buscar por nombre, evento o cuenta…" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
      <div className="fx-ar-filters" role="group" aria-label="Filtrar reglas por estado">{tabs.map(([key, text, count]) => <button key={key} className={filter === key ? "selected" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>{text}<span>{count}</span></button>)}</div>
    </div>
    <div className="fx-ar-list-meta"><span>{filtered.length} {filtered.length === 1 ? "regla" : "reglas"}{search.trim() ? ` para “${search.trim()}”` : ""}</span><span>Revisa el asiento antes de activar una versión</span></div>
    {filtered.length ? <div className="fx-ar-list" role="region" aria-label="Reglas contables">
      <div className="fx-ar-list-head" aria-hidden="true"><span>Regla y evento</span><span>Estado</span><span>Versión</span><span>Detalle</span></div>
      <ul>{filtered.map((rule) => {
        const version = versionsFor(rule).shown;
        return <li className={`fx-ar-row ${stateFor(rule).toLowerCase()}`} key={rule.id}>
          <div className="fx-ar-rule"><span className="fx-ar-rule-icon"><Scale size={18}/></span><div><h3>{rule.name}</h3><p>{eventFor(rule)}</p>{filtersFor(rule).length ? <div className="fx-ar-conditions">{filtersFor(rule).map((text) => <span key={text}>{text}</span>)}</div> : null}</div></div>
          <RuleBadge state={stateFor(rule)}/>
          <div className="fx-ar-version">{version ? <><strong>Versión {version.version}</strong><small>{version.lines.length} líneas de asiento</small></> : <small>Sin versión</small>}</div>
          <button className="fx-ar-review" aria-label={`Revisar regla ${rule.name}`} onClick={() => setSelectedId(rule.id)}>Revisar<ArrowRight size={14}/></button>
        </li>;
      })}</ul>
    </div> : <Empty title={rules.length ? "No hay reglas que coincidan" : "No hay reglas configuradas"} text={rules.length ? "Prueba otro nombre, cuenta o estado." : "Las reglas contables disponibles aparecerán aquí."} action={rules.length ? <button className="fx-btn ghost" onClick={() => { setSearch(""); setFilter("ALL"); }}>Limpiar filtros</button> : undefined}/>}
    <Drawer open={Boolean(selected)} title={selected?.name ?? "Revisar regla contable"} subtitle="Revisión de la regla contable y su asiento" wide onClose={() => setSelectedId(null)}>
      {selected ? <div className="fx-ar-detail">
        <div className="fx-ar-detail-heading"><div><small>EVENTO QUE ACTIVA LA REGLA</small><h4>{eventFor(selected)}</h4></div><RuleBadge state={stateFor(selected)}/></div>
        {selected.description ? <p className="fx-ar-description">{selected.description}</p> : null}
        <div className="fx-ar-detail-meta"><div><span>Versión revisada</span><strong>{shown ? `Versión ${shown.version} · ${versionLabels[shown.status]}` : "Sin versión"}</strong></div><div><span>Condiciones</span><strong>{filtersFor(selected).join(" · ") || "Todos los eventos de este tipo"}</strong></div></div>
        <section className="fx-ar-preview"><header><div><small>VISTA PREVIA</small><h4>Asiento propuesto</h4></div><span>{shown?.lines.length ?? 0} líneas</span></header>
          {shown?.lines.length ? <div className="fx-ar-lines"><table><thead><tr><th>Lado</th><th>Cuenta contable</th><th>Cálculo del monto</th><th>Dimensiones</th></tr></thead><tbody>{shown.lines.map((line, index) => <tr key={index}>
            <td data-label="Lado"><span className={`fx-ar-side ${line.side.toLowerCase()}`}>{line.side === "DEBIT" ? "Debe" : "Haber"}</span></td>
            <td data-label="Cuenta contable"><AccountReference line={line} accounts={accounts.data ?? []}/></td>
            <td data-label="Cálculo del monto"><strong className="fx-ar-formula">{line.amount.map((key) => amountLabels[key] ?? label(key)).join(" + ")}</strong></td>
            <td data-label="Dimensiones"><div className="fx-ar-dimensions">{line.dimensions.length ? line.dimensions.map((dimension) => <span key={dimension}>{dimensionLabels[dimension]}</span>) : <small>Sin dimensiones</small>}</div></td>
          </tr>)}</tbody></table></div> : <Empty title="Sin líneas de asiento"/>}
        </section>
        <div className="fx-ar-review-note"><ShieldCheck size={18}/><p>Verifica las cuentas y el cálculo del monto antes de activar. Una versión activa se conserva para mantener la trazabilidad contable.</p></div>
        {selectedVersions?.versions.length ? <section className="fx-ar-history"><h4>Historial de versiones</h4><ul>{selectedVersions.versions.map((version) => <li key={version.id}><span><strong>Versión {version.version}</strong><small>{version.activatedAt ? `Activada el ${moment(version.activatedAt)}` : `Creada el ${moment(version.createdAt)}`}</small></span><span className={`fx-ar-version-state ${version.status.toLowerCase()}`}>{versionLabels[version.status]}</span></li>)}</ul></section> : null}
        <details className="fx-ar-technical"><summary>Identificación de la regla</summary><dl><div><dt>Código</dt><dd><code>{selected.code}</code></dd></div><div><dt>Evento</dt><dd><code>{selected.eventType}</code></dd></div></dl></details>
        <Feedback error={actionError} notice={notice}/>
        <footer className="fx-ar-detail-actions"><button className="fx-btn ghost" onClick={() => setSelectedId(null)}>Cerrar revisión</button>{canManage && selectedVersions?.draft && !selectedVersions.active ? <button className="fx-btn primary" disabled={busy} onClick={() => void activate(selectedVersions.draft!.id, selected.name)}>{busy ? "Guardando…" : `Activar versión ${selectedVersions.draft.version}`}</button> : null}{canManage && selected.active ? <button className="fx-btn ghost" disabled={busy} onClick={() => void deactivate(selected.id)}>Desactivar regla</button> : null}</footer>
      </div> : null}
    </Drawer>
  </div>;
}
