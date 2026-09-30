"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, MapPin, Receipt, Sparkles, UserRound, Users, Wrench } from "lucide-react";
import type { CreateClientInput } from "@zyteron/contracts";
import { useAccess } from "@/components/access-context";
import { clientsApi } from "@/lib/clients-api";
import { isValidRut, normalizeRut } from "@/lib/rut";

const steps = [
  ["Empresa", Building2], ["Dirección", MapPin], ["Contacto", UserRound], ["Relación Zyteron", Users],
  ["Facturación", Receipt], ["Servicios", Wrench], ["Revisión", Check],
] as const;
const serviceCatalog = ["Desarrollo web", "Mantenimiento web", "Hosting", "SEO", "Soporte", "Software", "GPS", "Integraciones", "Consultoría"];

const initial: CreateClientInput = { legalName: "", tradeName: "", rut: "", country: "Chile", currency: "CLP", creditDays: 0, status: "ONBOARDING" };

export function NewClientWizard() {
  const { role } = useAccess();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateClientInput>(initial);
  const [contact, setContact] = useState({ name: "", position: "", email: "", phone: "", whatsapp: "" });
  const [services, setServices] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canManage = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"].includes(role);

  const stepValid = useMemo(() => {
    if (step === 0) return Boolean(form.legalName.trim() && isValidRut(form.rut));
    if (step === 1) return Boolean(form.country.trim());
    if (step === 2) return Boolean(contact.name.trim() && /^\S+@\S+\.\S+$/.test(contact.email));
    return true;
  }, [contact, form, step]);

  function update<K extends keyof CreateClientInput>(key: K, value: CreateClientInput[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function next() { if (!stepValid) { setError(step === 0 ? "Ingresa razón social y un RUT chileno válido." : "Completa los campos obligatorios del paso."); return; } setError(""); setStep((value) => Math.min(6, value + 1)); }

  async function submit() {
    setSubmitting(true); setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const client = await clientsApi.create(role, {
        ...form,
        accountExecutiveId: undefined,
        clientLeadId: undefined,
        developmentLeadId: undefined,
        rut: normalizeRut(form.rut), billingRut: form.billingRut ? normalizeRut(form.billingRut) : undefined,
        primaryContact: { ...contact, department: null, isPrimary: true, billingContact: true, technicalContact: false, commercialContact: true, portalAccess: false, status: "ACTIVE", contactTypes: ["PRINCIPAL", "COMERCIAL", "FACTURACION"], notes: null },
        initialServices: services.map((name) => ({ serviceId: name.toLowerCase().replaceAll(" ", "-"), catalogServiceId: null, serviceName: name, contractId: null, projectId: null, startDate: today, renewalDate: null, endDate: null, billingFrequency: null, agreedPrice: null, currency: form.currency ?? "CLP", status: "PENDING_ACTIVATION", responsibleUserId: null, technicalOwnerId: null, sla: null, notes: null, portalVisible: false })),
      });
      router.push(`/clients/${client.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible crear el cliente."); }
    finally { setSubmitting(false); }
  }

  if (!canManage) return <main className="clientWizard"><div className="clientError">Tu rol puede consultar clientes, pero no crear nuevos.</div><Link href="/clients">Volver a la cartera</Link></main>;

  return <main className="clientWizard">
    <header className="wizardHeader"><Link href="/clients"><ArrowLeft size={16}/> Volver a clientes</Link><span className="clientKicker">Alta de cliente</span><h1>Nuevo cliente</h1><p>Registro guiado de empresa, responsables, facturación y servicios iniciales.</p></header>
    <nav className="wizardSteps" aria-label="Pasos del formulario">{steps.map(([label, Icon], index) => <button key={label} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => index < step && setStep(index)} disabled={index > step}><span>{index < step ? <Check size={14}/> : <Icon size={14}/>}</span><small>Paso {index + 1}</small><strong>{label}</strong></button>)}</nav>
    <section className="wizardPanel">
      <div className="wizardTitle"><span>{step + 1}</span><div><p>Paso {step + 1} de 7</p><h2>{steps[step]![0]}</h2></div></div>
      {step === 0 ? <div className="wizardForm"><Field label="Razón social *" value={form.legalName} onChange={(value) => update("legalName", value)}/><Field label="Nombre fantasía" value={form.tradeName ?? ""} onChange={(value) => update("tradeName", value)}/><Field label="RUT *" value={form.rut} placeholder="18.866.264-1" invalid={Boolean(form.rut && !isValidRut(form.rut))} onBlur={() => isValidRut(form.rut) && update("rut", normalizeRut(form.rut))} onChange={(value) => update("rut", value)}/><Field label="Giro" value={form.businessActivity ?? ""} onChange={(value) => update("businessActivity", value)}/><Field label="Sitio web" value={form.website ?? ""} onChange={(value) => update("website", value)}/><Field label="Teléfono" value={form.phone ?? ""} onChange={(value) => update("phone", value)}/><Field label="Email general" type="email" value={form.generalEmail ?? ""} onChange={(value) => update("generalEmail", value)}/></div> : null}
      {step === 1 ? <div className="wizardForm"><Field label="País *" value={form.country} onChange={(value) => update("country", value)}/><Field label="Región" value={form.region ?? ""} onChange={(value) => update("region", value)}/><Field label="Comuna" value={form.commune ?? ""} onChange={(value) => update("commune", value)}/><Field className="wide" label="Dirección" value={form.address ?? ""} onChange={(value) => update("address", value)}/></div> : null}
      {step === 2 ? <div className="wizardForm"><Field label="Nombre *" value={contact.name} onChange={(value) => setContact((current) => ({ ...current, name: value }))}/><Field label="Cargo" value={contact.position} onChange={(value) => setContact((current) => ({ ...current, position: value }))}/><Field label="Email *" type="email" value={contact.email} onChange={(value) => setContact((current) => ({ ...current, email: value }))}/><Field label="Teléfono" value={contact.phone} onChange={(value) => setContact((current) => ({ ...current, phone: value }))}/><Field label="WhatsApp" value={contact.whatsapp} onChange={(value) => setContact((current) => ({ ...current, whatsapp: value }))}/></div> : null}
      {step === 3 ? <div className="wizardForm"><div className="assignmentNotice"><strong>Responsables por asignar</strong><p>La ejecutiva, el jefe de cliente y el jefe de desarrollo se seleccionarán desde el directorio cuando se habilite el módulo Usuarios. El cliente puede crearse ahora sin esas asignaciones.</p></div><Field label="Origen cliente" value={form.source ?? ""} onChange={(value) => update("source", value)}/><Field label="Tipo cliente" value={form.clientType ?? ""} onChange={(value) => update("clientType", value)}/><label>Estado<select value={form.status} onChange={(event) => update("status", event.target.value as CreateClientInput["status"])}><option value="ONBOARDING">Onboarding</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select></label></div> : null}
      {step === 4 ? <div className="wizardForm"><Field label="Razón social facturación" value={form.billingLegalName ?? ""} onChange={(value) => update("billingLegalName", value)}/><Field label="RUT facturación" value={form.billingRut ?? ""} onChange={(value) => update("billingRut", value)}/><Field label="Giro" value={form.billingActivity ?? ""} onChange={(value) => update("billingActivity", value)}/><Field label="Dirección tributaria" value={form.billingAddress ?? ""} onChange={(value) => update("billingAddress", value)}/><Field label="Email DTE" type="email" value={form.dteEmail ?? ""} onChange={(value) => update("dteEmail", value)}/><Field label="Condiciones de pago" value={form.paymentTerms ?? ""} onChange={(value) => update("paymentTerms", value)}/><Field label="Días crédito" type="number" value={String(form.creditDays ?? 0)} onChange={(value) => update("creditDays", Number(value))}/><label>Moneda<select value={form.currency} onChange={(event) => update("currency", event.target.value)}><option>CLP</option><option>USD</option><option>EUR</option></select></label></div> : null}
      {step === 5 ? <div className="servicePicker"><p>Selecciona servicios iniciales. Se crearán en estado pendiente hasta su activación contractual.</p>{serviceCatalog.map((service) => <label key={service}><input type="checkbox" checked={services.includes(service)} onChange={(event) => setServices(event.target.checked ? [...services, service] : services.filter((item) => item !== service))}/><span><Sparkles size={15}/>{service}</span></label>)}</div> : null}
      {step === 6 ? <Review form={form} contact={contact} services={services}/> : null}
      {error ? <p className="wizardError">{error}</p> : null}
      <footer className="wizardActions"><button disabled={step === 0 || submitting} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={15}/> Anterior</button>{step < 6 ? <button className="primary" onClick={next} disabled={!stepValid}>Continuar <ArrowRight size={15}/></button> : <button className="primary" onClick={submit} disabled={submitting}>{submitting ? "Creando cliente…" : "Confirmar creación"}<Check size={15}/></button>}</footer>
    </section>
  </main>;
}

function Field({ label, value, onChange, onBlur, type = "text", placeholder, invalid, className }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; type?: string; placeholder?: string; invalid?: boolean; className?: string }) {
  return <label className={className}>{label}<input className={invalid ? "invalid" : ""} type={type} value={value} placeholder={placeholder} onBlur={onBlur} onChange={(event) => onChange(event.target.value)}/>{invalid ? <small>RUT inválido</small> : null}</label>;
}
function Review({ form, contact, services }: { form: CreateClientInput; contact: { name: string; email: string }; services: string[] }) {
  return <div className="clientReview"><div><span>Empresa</span><strong>{form.legalName}</strong><p>{form.tradeName || "Sin nombre fantasía"} · {normalizeRut(form.rut)}</p></div><div><span>Contacto principal</span><strong>{contact.name}</strong><p>{contact.email}</p></div><div><span>Relación</span><strong>{form.status === "ACTIVE" ? "Activo" : "Onboarding"}</strong><p>{form.accountExecutiveId || "Ejecutiva por asignar"}</p></div><div><span>Facturación</span><strong>{form.currency} · {form.creditDays ?? 0} días</strong><p>{form.dteEmail || form.generalEmail || "Email DTE pendiente"}</p></div><div className="wide"><span>Servicios iniciales</span><strong>{services.length ? services.join(" · ") : "Sin servicios iniciales"}</strong><p>Los servicios se activan solamente después de validación contractual.</p></div></div>;
}
