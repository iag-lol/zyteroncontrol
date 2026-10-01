import { hasFinancePermission, type FinancePermission, type Role } from "@zyteron/contracts";

const clp=new Intl.NumberFormat("es-CL",{maximumFractionDigits:0});
const dec=new Intl.NumberFormat("es-CL",{maximumFractionDigits:2});
/** Montos exactos (sin abreviar): una cifra financiera nunca se presenta como aproximada. */
export const money=(value:number|null|undefined,currency="CLP")=>value===null||value===undefined?"—":`${value<0?"−":""}${currency==="CLP"?"$":`${currency} `}${(currency==="CLP"?clp:dec).format(Math.abs(value))}`;
export const amount=(value:number|null|undefined)=>value===null||value===undefined?"—":dec.format(value);
/** Fechas contables AAAA-MM-DD → DD-MM-AAAA (sin conversión horaria). */
export const day=(value:string|null|undefined)=>value?`${value.slice(8,10)}-${value.slice(5,7)}-${value.slice(0,4)}`:"—";
const stamp=new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
/** Instantes UTC → DD-MM-AAAA HH:mm en America/Santiago. */
export const moment=(value:string|null|undefined)=>{if(!value)return"—";const parts=stamp.formatToParts(new Date(value));const get=(type:string)=>parts.find((p)=>p.type===type)?.value??"";return`${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}`;};
export const period=(key:string|null|undefined)=>key?`${key.slice(5,7)}-${key.slice(0,4)}`:"—";
export const todayIso=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago"}).format(new Date());
export const monthKey=()=>todayIso().slice(0,7);
/** Campo DD-MM-AAAA → AAAA-MM-DD (null si inválida). */
export function parseDay(value:string){const m=/^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());if(!m)return null;const iso=`${m[3]}-${m[2]}-${m[1]}`;const d=new Date(`${iso}T12:00:00Z`);return Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==iso?null:iso;}

const labels:Record<string,string>={DRAFT:"Borrador",PENDING_APPROVAL:"Por aprobar",READY_TO_ISSUE:"Lista para emitir",ISSUING:"Emitiendo",ISSUED:"Emitida",PARTIALLY_PAID:"Pago parcial",PAID:"Pagada",CANCELLED:"Anulada",CREDITED:"Acreditada",VOID:"Nula",OVERDUE:"Vencida",
  VALIDATED:"Validado",SIGNED:"Firmado",SUBMITTED:"Enviado al SII",RECEIVED_BY_SII:"Recibido por SII",ACCEPTED:"Aceptado",ACCEPTED_WITH_REPAIRS:"Aceptado con reparos",REJECTED:"Rechazado",
  PENDING:"Pendiente",PENDING_VERIFICATION:"Por verificar",CONFIRMED:"Confirmado",FAILED:"Fallido",REFUNDED:"Devuelto",PARTIALLY_REFUNDED:"Devolución parcial",DISPUTED:"En disputa",CHARGEBACK:"Contracargo",
  POSTED:"Contabilizado",PENDING_REVIEW:"En revisión",REVERSED:"Revertido",OPEN:"Abierto",CLOSING:"En cierre",CLOSED:"Cerrado",LOCKED:"Bloqueado",
  APPROVED:"Aprobado",SCHEDULED:"Programado",UNRECONCILED:"Sin conciliar",PARTIALLY_RECONCILED:"Parcial",RECONCILED:"Conciliado",IGNORED:"Ignorado",REQUESTED:"Solicitado",EXECUTED:"Pagado",
  KEPT:"Cumplida",BROKEN:"Incumplida",RESCHEDULED:"Reprogramada",ACTIVE:"Activo",INACTIVE:"Inactivo",BLOCKED:"Bloqueado",RETIRED:"Retirado",
  PREPARATION:"En preparación",REVIEW_REQUIRED:"Requiere revisión",REVIEWED:"Revisado",READY:"Listo",FILED_EXTERNALLY:"Presentado (externo)",
  ELIGIBLE:"Elegible",NOT_ELIGIBLE:"No elegible",PAYABLE:"Por pagar",IN_PROGRESS:"En curso",OK:"OK",WAIVED:"Dispensado",NOT_APPLICABLE:"No aplica",
  UNMAPPED:"Sin regla",ENTRY_CREATED:"Borrador creado",ERROR:"Error",SKIPPED:"Omitido",PENDING_REVIEW_CLASS:"Por clasificar",
  DEL_GIRO:"Del giro",SUPERMERCADO:"Supermercado",BIENES_RAICES:"Bienes raíces",ACTIVO_FIJO:"Activo fijo",USO_COMUN:"Uso común",NO_RECUPERABLE:"No recuperable",NO_CORRESPONDE:"No corresponde",
  MATCHED:"Coincide",MISSING_LOCAL:"Falta en Zyteron",MISSING_SII:"Falta en SII",AMOUNT_MISMATCH:"Diferencia de monto",STATUS_MISMATCH:"Diferencia de estado",
  GREEN:"Saludable",ATTENTION:"Atención",RISK:"Riesgo",CRITICAL:"Crítico",INFO:"Info",REAL:"Real",PROJECTION:"Proyección",
  CERTIFICATION:"Certificación",PRODUCTION:"Producción",NONE:"Sin proveedor",SII_DIRECT:"SII directo",EXTERNAL:"Proveedor certificado",
  BANK_TRANSFER:"Transferencia",PAYMENT:"Cobro",VENDOR_PAYMENT:"Pago a proveedor",PROVIDER_PAYOUT:"Liquidación pasarela",JOURNAL_ENTRY:"Asiento",REFUND:"Devolución",COMMISSION_PAYMENT:"Pago de comisión",CASH_MOVEMENT:"Movimiento de caja",INVOICE:"Factura",EXPENSE:"Gasto",MERCADOPAGO:"Mercado Pago",CASH:"Efectivo",OTHER:"Otro",CREDIT:"Abono",DEBIT:"Cargo"};
export const label=(value:string|null|undefined)=>value?labels[value]??value.replaceAll("_"," ").toLowerCase().replace(/^./,(c)=>c.toUpperCase()):"—";
export const tone=(value:string|null|undefined):"good"|"warn"|"bad"|"neutral"|"info"=>{if(!value)return"neutral";if(["PAID","ACCEPTED","CONFIRMED","POSTED","RECONCILED","OK","KEPT","MATCHED","GREEN","APPROVED","EXECUTED","ACTIVE","CLOSED","FILED_EXTERNALLY","REVIEWED","READY","ELIGIBLE","ENTRY_CREATED","CREDITED"].includes(value))return"good";if(["OVERDUE","REJECTED","FAILED","CHARGEBACK","BROKEN","CRITICAL","ERROR","BLOCKED","AMOUNT_MISMATCH","STATUS_MISMATCH","DISPUTED"].includes(value))return"bad";if(["PENDING_APPROVAL","PENDING_VERIFICATION","PARTIALLY_PAID","PENDING_REVIEW","REVIEW_REQUIRED","ATTENTION","RISK","UNRECONCILED","PARTIALLY_RECONCILED","UNMAPPED","MISSING_LOCAL","MISSING_SII","PAYABLE","SUBMITTED","RECEIVED_BY_SII","ISSUING","ACCEPTED_WITH_REPAIRS"].includes(value))return"warn";if(["DRAFT","READY_TO_ISSUE","ISSUED","OPEN","IN_PROGRESS","PREPARATION","SCHEDULED","REQUESTED","PROJECTION"].includes(value))return"info";return"neutral";};

/** Menú del módulo (22 secciones) con el permiso mínimo de cada una (mismo criterio que la API). */
export const financeSections:Array<{key:string;href:string;label:string;group:string;permission:FinancePermission}>=[
  {key:"command",href:"/finance",label:"Financial Command Center",group:"Control",permission:"finance.dashboard.view"},
  {key:"invoices",href:"/finance/invoices",label:"Facturación",group:"Ingresos",permission:"invoice.view"},
  {key:"tax-documents",href:"/finance/tax-documents",label:"Documentos tributarios",group:"Ingresos",permission:"dte.view"},
  {key:"receivables",href:"/finance/receivables",label:"Cuentas por cobrar",group:"Ingresos",permission:"receivable.view"},
  {key:"collections",href:"/finance/collections",label:"Cobranza",group:"Ingresos",permission:"collection.manage"},
  {key:"payments",href:"/finance/payments",label:"Pagos recibidos",group:"Ingresos",permission:"payment.view"},
  {key:"payables",href:"/finance/payables",label:"Cuentas por pagar",group:"Egresos",permission:"payable.view"},
  {key:"vendors",href:"/finance/vendors",label:"Proveedores",group:"Egresos",permission:"payable.view"},
  {key:"expenses",href:"/finance/expenses",label:"Gastos",group:"Egresos",permission:"expense.view"},
  {key:"banks",href:"/finance/banks",label:"Bancos y cajas",group:"Tesorería",permission:"bank.view"},
  {key:"reconciliation",href:"/finance/reconciliation",label:"Conciliación",group:"Tesorería",permission:"bank.view"},
  {key:"accounting",href:"/finance/accounting",label:"Contabilidad",group:"Contabilidad",permission:"accounting.view"},
  {key:"journal",href:"/finance/journal",label:"Libro Diario",group:"Contabilidad",permission:"accounting.view"},
  {key:"general-ledger",href:"/finance/general-ledger",label:"Libro Mayor",group:"Contabilidad",permission:"accounting.view"},
  {key:"chart-of-accounts",href:"/finance/chart-of-accounts",label:"Plan de cuentas",group:"Contabilidad",permission:"accounting.view"},
  {key:"cost-centers",href:"/finance/cost-centers",label:"Centros de costo",group:"Contabilidad",permission:"accounting.view"},
  {key:"budgets",href:"/finance/budgets",label:"Presupuestos",group:"Gestión",permission:"report.finance.view"},
  {key:"taxes",href:"/finance/taxes",label:"IVA / Impuestos",group:"Gestión",permission:"tax.view"},
  {key:"commissions",href:"/finance/commissions",label:"Comisiones",group:"Gestión",permission:"commission.finance.manage"},
  {key:"closing",href:"/finance/closing",label:"Cierres contables",group:"Gestión",permission:"period.view"},
  {key:"reports",href:"/finance/reports",label:"Informes financieros",group:"Gestión",permission:"report.finance.view"},
  {key:"settings",href:"/finance/settings",label:"Configuración contable",group:"Gestión",permission:"finance.dashboard.view"},
];
export const canFinance=(role:Role,permission:FinancePermission)=>hasFinancePermission(role,permission);
export const financeSectionsFor=(role:Role)=>financeSections.filter((s)=>canFinance(role,s.permission));
export const canSeeFinancePath=(role:Role,href:string)=>{const section=financeSections.find((s)=>s.href===href);return section?canFinance(role,section.permission):true;};
