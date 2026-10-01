"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Upload, X } from "lucide-react";
import "@/app/finance.css";
import { errorText, fileToUpload, type UploadedFile } from "@/lib/finance-api";
import { day, label, money, parseDay, tone } from "@/lib/finance-format";

/** Carga con estado explícito; nunca muestra datos de ejemplo cuando la API falla. */
export function useLoad<T>(loader:()=>Promise<T>,deps:unknown[]){
  const[data,setData]=useState<T|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);const seq=useRef(0);
  const reload=useCallback(async()=>{const n=++seq.current;setLoading(true);try{const value=await loader();if(n===seq.current){setData(value);setError("");}}catch(reason){if(n===seq.current)setError(errorText(reason));}finally{if(n===seq.current)setLoading(false);}},deps);
  useEffect(()=>{void reload();},[reload]);return{data,error,loading,reload,setData};
}
export function useAction(after?:()=>unknown){
  const[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const run=useCallback(async<T,>(work:()=>Promise<T>,message?:string)=>{setBusy(true);setError("");setNotice("");try{const result=await work();if(message)setNotice(message);await after?.();return result;}catch(reason){setError(errorText(reason));return undefined;}finally{setBusy(false);}},[after]);
  return{busy,error,notice,run,setError,setNotice};
}
export function Feedback({error,notice}:{error?:string;notice?:string}){if(!error&&!notice)return null;return <div className={`fx-feedback ${error?"bad":"good"}`} role={error?"alert":"status"}>{error?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}<span>{error||notice}</span></div>;}
export function Pill({value,text}:{value:string|null|undefined;text?:string}){return <span className={`fx-pill ${tone(value)}`}>{text??label(value)}</span>;}
export function Amount({value,currency="CLP",strong=false,signed=false}:{value:number|null|undefined;currency?:string;strong?:boolean;signed?:boolean}){const negative=(value??0)<0;return <span className={`fx-amount${strong?" strong":""}${signed&&negative?" neg":""}`}>{money(value,currency)}</span>;}
export function Stamp({children,kind="info"}:{children:ReactNode;kind?:"info"|"warn"|"bad"|"good"}){return <span className={`fx-stamp ${kind}`}>{children}</span>;}
export function Section({eyebrow,title,description,actions,children,className=""}:{eyebrow?:string;title:string;description?:ReactNode;actions?:ReactNode;children:ReactNode;className?:string}){return <section className={`fx-section ${className}`}><header><div>{eyebrow?<small>{eyebrow}</small>:null}<h2>{title}</h2>{description?<p>{description}</p>:null}</div>{actions?<div className="fx-actions">{actions}</div>:null}</header>{children}</section>;}
export function Empty({title,text,action}:{title:string;text?:string;action?:ReactNode}){return <div className="fx-empty"><Info size={18}/><strong>{title}</strong>{text?<p>{text}</p>:null}{action}</div>;}
export function Loading({text="Cargando datos financieros…"}:{text?:string}){return <div className="fx-loading" aria-busy="true"><span/>{text}</div>;}
export function LoadError({error,retry}:{error:string;retry:()=>void}){return <div className="fx-empty bad"><AlertTriangle size={18}/><strong>No fue posible cargar la información</strong><p>{error}</p><button className="fx-btn" onClick={retry}>Reintentar</button></div>;}

export interface Column<T>{ key:string; label:string; render:(row:T)=>ReactNode; align?:"right"|"center"; width?:string; }
/** Registro tabular con cifras alineadas y fila de totales con doble raya contable. */
export function Register<T>({rows,columns,onRow,selected,rowKey,totals,empty="Sin registros"}:{rows:T[];columns:Column<T>[];onRow?:(row:T)=>void;selected?:string|null;rowKey:(row:T)=>string;totals?:ReactNode[];empty?:string}){
  if(!rows.length)return <Empty title={empty}/>;
  return <div className="fx-register" role="region" aria-label="Registro" tabIndex={0}><table><thead><tr>{columns.map((c)=><th key={c.key} style={{width:c.width,textAlign:c.align}}>{c.label}</th>)}</tr></thead>
    <tbody>{rows.map((row)=>{const key=rowKey(row);return <tr key={key} className={`${onRow?"clickable":""}${selected===key?" selected":""}`} onClick={onRow?()=>onRow(row):undefined} onKeyDown={onRow?(e)=>{if(e.key==="Enter")onRow(row);}:undefined} tabIndex={onRow?0:undefined}>{columns.map((c)=><td key={c.key} style={{textAlign:c.align}}>{c.render(row)}</td>)}</tr>;})}</tbody>
    {totals?<tfoot><tr>{totals.map((cell,i)=><td key={i} style={{textAlign:columns[i]?.align}}>{cell}</td>)}</tr></tfoot>:null}</table></div>;
}
export function Drawer({open,title,subtitle,onClose,children,wide=false}:{open:boolean;title:string;subtitle?:ReactNode;onClose:()=>void;children:ReactNode;wide?:boolean}){
  useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[open,onClose]);
  if(!open)return null;return <div className="fx-overlay" onClick={onClose}><aside className={`fx-drawer${wide?" wide":""}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e)=>e.stopPropagation()}><header><div><h3>{title}</h3>{subtitle?<p>{subtitle}</p>:null}</div><button className="fx-icon" onClick={onClose} aria-label="Cerrar"><X size={16}/></button></header><div className="fx-drawer-body">{children}</div></aside></div>;
}
export function Field({label:text,hint,children,span=1}:{label:string;hint?:string;children:ReactNode;span?:1|2|3}){return <label className={`fx-field span${span}`}><span>{text}</span>{children}{hint?<small>{hint}</small>:null}</label>;}
/** Fecha en formato chileno DD-MM-AAAA; entrega AAAA-MM-DD validado. */
export function DateInput({value,onChange,required}:{value:string;onChange:(iso:string)=>void;required?:boolean}){const[text,setText]=useState(value?day(value):"");useEffect(()=>{setText(value?day(value):"");},[value]);const invalid=text!==""&&!parseDay(text);return <input inputMode="numeric" placeholder="DD-MM-AAAA" value={text} required={required} aria-invalid={invalid} className={invalid?"invalid":""} onChange={(e)=>{const next=e.target.value.replace(/[^\d-]/g,"").slice(0,10);setText(next);const iso=parseDay(next);if(iso)onChange(iso);else if(!next)onChange("");}}/>;}
export function FileInput({onFile,accept,label:text="Adjuntar archivo",file}:{onFile:(file:UploadedFile|null)=>void;accept?:string;label?:string;file?:UploadedFile|null}){const[error,setError]=useState("");return <label className="fx-file"><Upload size={14}/><span>{file?file.fileName:text}</span><input type="file" accept={accept} onChange={async(e)=>{const selected=e.target.files?.[0];if(!selected){onFile(null);return;}if(selected.size>15*1024*1024){setError("Máximo 15 MB.");return;}setError("");onFile(await fileToUpload(selected));}}/>{error?<small className="bad">{error}</small>:null}</label>;}
/** Diálogo de motivo obligatorio (reversas, anulaciones, reaperturas): toda acción sensible queda justificada. */
export function ReasonDialog({open,title,description,confirm="Confirmar",onCancel,onConfirm,extra}:{open:boolean;title:string;description?:string;confirm?:string;onCancel:()=>void;onConfirm:(reason:string)=>void;extra?:ReactNode}){const[reason,setReason]=useState("");useEffect(()=>{if(open)setReason("");},[open]);if(!open)return null;return <div className="fx-overlay" onClick={onCancel}><div className="fx-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e)=>e.stopPropagation()}><h3>{title}</h3>{description?<p>{description}</p>:null}{extra}<textarea autoFocus rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Motivo (obligatorio, queda en auditoría)"/><div className="fx-actions"><button className="fx-btn ghost" onClick={onCancel}>Cancelar</button><button className="fx-btn primary" disabled={!reason.trim()} onClick={()=>onConfirm(reason.trim())}>{confirm}</button></div></div></div>;}
/** Barra apilada de antigüedad (5 tramos desde vencimiento). */
export function AgingBar({buckets}:{buckets:Array<{key:string;label:string;amount:number;count:number}>}){const total=buckets.reduce((t,b)=>t+b.amount,0);if(!total)return <Empty title="Sin saldos abiertos"/>;return <div className="fx-aging"><div className="fx-aging-bar" role="img" aria-label="Antigüedad de saldos">{buckets.filter((b)=>b.amount>0).map((b)=><span key={b.key} className={`b-${b.key}`} style={{flexGrow:b.amount}} title={`${b.label}: ${money(b.amount)}`}/>)}</div><ul>{buckets.map((b)=><li key={b.key}><i className={`b-${b.key}`}/><span>{b.label}</span><strong>{money(b.amount)}</strong><small>{b.count} doc.</small></li>)}</ul></div>;}
export function KeyValue({items}:{items:Array<[string,ReactNode]>}){return <dl className="fx-kv">{items.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;}
/** Lee parámetros de la URL después del montaje (evita diferencias de hidratación SSR/cliente). */
export function useQueryParams(apply:(params:URLSearchParams)=>void){const applied=useRef(false);useEffect(()=>{if(applied.current)return;applied.current=true;apply(new URLSearchParams(window.location.search));});}
export const pick=<T,>(value:T|null|undefined,fallback:T)=>value??fallback;
