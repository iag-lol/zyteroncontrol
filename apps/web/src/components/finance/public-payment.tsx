"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Landmark, Lock, XCircle } from "lucide-react";
import { errorText, publicPaymentApi } from "@/lib/finance-api";
import { day, label, money } from "@/lib/finance-format";

interface PublicView { issuer:string; document:string; clientName:string|null; issueDate:string|null; dueDate:string|null; currency:string; total:number; balance:number; status:string; payable:boolean; online:{enabled:boolean;publicKey:string|null;redirectNotice:string}; }
declare global { interface Window { MercadoPago?: new (key:string,options:{locale:string})=>{bricks:()=>{create:(type:string,container:string,settings:unknown)=>Promise<{unmount:()=>void}>}}; } }
function loadSdk(){return new Promise<void>((resolve,reject)=>{if(window.MercadoPago){resolve();return;}const script=document.createElement("script");script.src="https://sdk.mercadopago.com/js/v2";script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error("No fue posible cargar el formulario seguro de Mercado Pago."));document.head.appendChild(script);});}

/** Portal de pago por link: el monto lo fija el servidor; los datos de tarjeta van directo a Mercado Pago (Payment Brick). */
export function PublicPayment({token}:{token:string}){
  const[view,setView]=useState<PublicView|null>(null);const[error,setError]=useState("");const[result,setResult]=useState<{status:string;reference:string;message:string}|null>(null);const brick=useRef<{unmount:()=>void}|null>(null);const key=useMemo(()=>crypto.randomUUID(),[]);
  useEffect(()=>{publicPaymentApi.view(token).then(setView).catch((reason)=>setError(errorText(reason)));},[token]);
  useEffect(()=>{if(!view?.payable||!view.online.enabled||!view.online.publicKey||result)return;let cancelled=false;
    void loadSdk().then(async()=>{if(cancelled||!window.MercadoPago)return;const mp=new window.MercadoPago(view.online.publicKey!,{locale:"es-CL"});brick.current=await mp.bricks().create("payment","fxPaymentBrick",{initialization:{amount:view.balance},customization:{paymentMethods:{creditCard:"all",debitCard:"all",maxInstallments:12}},callbacks:{onReady:()=>undefined,onError:()=>setError("El formulario de pago informó un error. Intenta nuevamente."),onSubmit:({formData}:{formData:unknown})=>publicPaymentApi.pay(token,formData,key).then((r)=>{setResult(r);}).catch((reason)=>{setError(errorText(reason));throw reason;})}});}).catch((reason)=>setError(errorText(reason)));
    return()=>{cancelled=true;brick.current?.unmount();};},[view,token,key,result]);
  return <main className="fx-public"><header><span className="fx-seal"><Landmark size={18}/></span><div><small>PAGO SEGURO</small><h1>{view?.issuer??"Zyteron"}</h1></div><Lock size={16} aria-label="Conexión segura"/></header>
    {error&&!view?<section className="fx-public-card"><XCircle size={28}/><h2>Link no disponible</h2><p>{error}</p></section>:!view?<section className="fx-public-card"><p>Cargando documento…</p></section>:<>
      <section className="fx-public-card"><small>{view.document}</small><h2>{money(view.balance,view.currency)}</h2><p>Saldo pendiente de {view.clientName??"cliente"}</p><dl><div><dt>Emisión</dt><dd>{day(view.issueDate)}</dd></div><div><dt>Vencimiento</dt><dd>{day(view.dueDate)}</dd></div><div><dt>Total documento</dt><dd>{money(view.total,view.currency)}</dd></div><div><dt>Estado</dt><dd>{label(view.status)}</dd></div></dl></section>
      {result?<section className={`fx-public-card result ${result.status==="CONFIRMED"?"good":result.status==="PENDING"?"warn":"bad"}`}>{result.status==="CONFIRMED"?<CheckCircle2 size={28}/>:result.status==="PENDING"?<Clock3 size={28}/>:<XCircle size={28}/>}<h2>{result.status==="CONFIRMED"?"Pago verificado":result.status==="PENDING"?"Pago en proceso":"Pago no aprobado"}</h2><p>{result.message}</p><small>Referencia {result.reference}</small></section>
      :!view.payable?<section className="fx-public-card"><CheckCircle2 size={24}/><p>Este documento no tiene saldo pendiente.</p></section>
      :view.online.enabled?<section className="fx-public-card"><div id="fxPaymentBrick"/><p className="fx-public-note">{view.online.redirectNotice}</p><p className="fx-public-note">Zyteron no recibe ni almacena los datos de tu tarjeta.</p>{error?<p className="bad">{error}</p>:null}</section>
      :<section className="fx-public-card"><p>El pago en línea no está disponible para este documento. Contacta a {view.issuer} para coordinar otra forma de pago.</p></section>}</>}
    <footer>Documento emitido por {view?.issuer??"Zyteron"} · Esta página no reemplaza al documento tributario.</footer></main>;
}
