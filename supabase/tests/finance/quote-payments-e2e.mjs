// E2E HTTP del calendario de pagos de cotizaciones contra la API en modo memoria (AUTH_MODE=development, sin SUPABASE_URL).
// Arranque: RESEND_API_KEY=test-stub SALES_MAIL_FROM=ventas@zyteron.test node --import ./test-mail-stub.mjs apps/api/dist/main.js
// (el stub sólo permite «enviar» la cotización para poder aceptarla). Uso: API=http://localhost:4517/api node quote-payments-e2e.mjs
const base=process.env.API??"http://localhost:4517/api";
const users={gg:"11111111-1111-4111-8111-111111111111",fin:"22222222-2222-4222-8222-222222222222",cont:"33333333-3333-4333-8333-333333333333",ej:"44444444-4444-4444-8444-444444444444",ej2:"44444444-4444-4444-8444-555555555555",portal:"66666666-6666-4666-8666-666666666666"};
let pass=0,fail=0;const check=(name,ok,extra="")=>{if(ok){pass++;console.log("✓",name,extra);}else{fail++;console.log("✗",name,extra);}};
async function call(role,user,method,path,body,headers={}){const r=await fetch(base+path,{method,headers:{"content-type":"application/json","x-zyteron-role":role,"x-zyteron-user-id":user,...headers},body:body?JSON.stringify(body):undefined});const type=r.headers.get("content-type")??"";const data=type.includes("json")?await r.json():Buffer.from(await r.arrayBuffer());return{status:r.status,data,headers:r.headers};}
const as={gg:(m,p,b,h)=>call("GERENTE_GENERAL",users.gg,m,p,b,h),fin:(m,p,b,h)=>call("FINANZAS",users.fin,m,p,b,h),cont:(m,p,b,h)=>call("CONTADOR",users.cont,m,p,b,h),ej:(m,p,b,h)=>call("EJECUTIVA_VENTAS",users.ej,m,p,b,h),ej2:(m,p,b,h)=>call("EJECUTIVA_VENTAS",users.ej2,m,p,b,h),dev:(m,p,b,h)=>call("PROGRAMADOR","55555555-5555-4555-8555-555555555555",m,p,b,h),portal:(m,p,b,h)=>call("PORTAL_CLIENT",users.portal,m,p,b,h)};
function rut(n){let s=0,f=2;for(const d of String(n).split("").reverse()){s+=Number(d)*f;f=f===7?2:f+1;}const r=11-(s%11);return`${n}-${r===11?"0":r===10?"K":r}`;}
const b64=(s)=>Buffer.from(s).toString("base64");const today=new Date().toLocaleDateString("sv-SE",{timeZone:"America/Santiago"});
const addMonths=(iso,n)=>{const d=new Date(`${iso.slice(0,7)}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,10);};
const seed=Date.now()%1000000,clientRut=rut(70000000+seed),companyRut=rut(77123456);

// Cotización real aceptada por el flujo comercial (borrador → aprobación → PDF → envío → aceptación)
let r=await as.gg("POST","/clients",{legalName:"Cliente Mensual SpA",rut:clientRut,country:"Chile"});check("crear cliente",r.status===201,r.status);const clientId=r.data.id;
await as.fin("PATCH","/finance/settings",{companyRut});
r=await as.gg("POST","/quotes",{clientId,ownerId:users.ej,companyName:"Cliente Mensual SpA",contactEmail:"pagos@mensual.cl",items:[{description:"Mantención mensual",quantity:1,unitPrice:100000}]});const quoteId=r.data.id;const quoteTotal=r.data.totalAmount;
for(const[step,actor,body,headers]of[["submit-approval",as.gg],["approve",as.gg],["pdf",as.gg],["send",as.gg,{to:"pagos@mensual.cl"},{"idempotency-key":`s-${seed}`}],["accept",as.gg,{},{"idempotency-key":`a-${seed}`}]])await actor("POST",`/quotes/${quoteId}/${step}`,body??{},headers??{});
r=await as.fin("GET",`/finance/quote-payments/quotes/${quoteId}`);check("cotización aceptada elegible para calendario",r.status===200&&r.data.eligible&&!r.data.plan,`${r.status} ${r.data.quote?.status}`);

// Plan mensual de 3 cuotas: 1ª vencida (mes anterior), 2ª vence hoy (habilitada), 3ª el mes siguiente
r=await as.dev("PUT",`/finance/quote-payments/quotes/${quoteId}/plan`,{frequency:"MONTHLY",startDate:today});check("Desarrollo sin acceso (403)",r.status===403,r.status);
r=await as.cont("PUT",`/finance/quote-payments/quotes/${quoteId}/plan`,{frequency:"MONTHLY",startDate:today});check("Contador sólo lectura (403)",r.status===403,r.status);
r=await as.ej2("GET",`/finance/quote-payments/quotes/${quoteId}`);check("otra ejecutiva no ve la cotización (403)",r.status===403,r.status);
r=await as.ej("PUT",`/finance/quote-payments/quotes/${quoteId}/plan`,{frequency:"MONTHLY",amount:quoteTotal,startDate:`${addMonths(today,-1).slice(0,7)}-01`,paymentDay:Number(today.slice(8,10)),totalInstallments:3,activationDaysBefore:5});
check("ejecutiva dueña crea plan mensual de 3 cuotas",r.status===200&&r.data.installments.length===3,`${r.status} ${r.data.message??r.data.installments?.map((i)=>`${i.dueDate}:${i.effectiveStatus}`).join(" ")}`);
const[first,second,third]=r.data.installments??[];
check("estados: vencida, habilitada y próxima",[first,second,third].map((i)=>i?.effectiveStatus).join()==="OVERDUE,PAYMENT_OPEN,UPCOMING");
check("cuota próxima indica cuándo se habilita",third&&third.canMarkPaid===false&&third.paymentOpensOn<third.dueDate,third?.paymentOpensOn);

// Pago con factura SII obligatoria
const payBody=(folio,invoice)=>({paymentMethod:"TRANSFER",paymentReference:`OP-${folio}`,siiDocumentType:33,siiFolio:folio,invoice});
const pdf={fileName:"factura-501.pdf",contentBase64:b64("%PDF-1.4 factura SII 501"),mimeType:"application/pdf"};
r=await as.ej("POST",`/finance/quote-payments/installments/${first.id}/mark-paid`,payBody(501,pdf));check("ejecutiva no marca pagos (403)",r.status===403,r.status);
r=await as.fin("POST",`/finance/quote-payments/installments/${first.id}/mark-paid`,payBody(501));check("sin factura adjunta: rechazado",r.status===400,r.data.message);
r=await as.fin("POST",`/finance/quote-payments/installments/${first.id}/mark-paid`,payBody(501,{fileName:"x.pdf",contentBase64:b64("hola"),mimeType:"application/pdf"}));check("archivo que no es PDF/XML: rechazado",r.status===422,r.data.message);
r=await as.fin("POST",`/finance/quote-payments/installments/${third.id}/mark-paid`,payBody(503,pdf));check("cuota no habilitada: rechazada con fecha de habilitación",r.status===409&&/se habilita el \d{2}-\d{2}-\d{4}/.test(r.data.message),r.data.message);
r=await as.fin("POST",`/finance/quote-payments/installments/${first.id}/mark-paid`,payBody(501,pdf));check("cuota vencida pagada con factura PDF",r.status===200&&r.data.status==="PAID"&&r.data.hasInvoice,`${r.status} ${r.data.message??r.data.status}`);
const xml=(folio,receiver)=>`<?xml version="1.0"?><DTE><Documento><Encabezado><IdDoc><TipoDTE>33</TipoDTE><Folio>${folio}</Folio><FchEmis>${today}</FchEmis></IdDoc><Emisor><RUTEmisor>${companyRut}</RUTEmisor><RznSoc>Zyteron SpA</RznSoc></Emisor><Receptor><RUTRecep>${receiver}</RUTRecep></Receptor><Totales><MntNeto>100000</MntNeto><IVA>19000</IVA><MntTotal>119000</MntTotal></Totales></Encabezado><TED/></Documento></DTE>`;
r=await as.fin("POST",`/finance/quote-payments/installments/${second.id}/mark-paid`,payBody(502,{fileName:"dte.xml",contentBase64:b64(xml(502,rut(76111222))),mimeType:"application/xml"}));check("XML de otro receptor: rechazado",r.status===422&&/receptor/.test(r.data.message),r.data.message);
r=await as.fin("POST",`/finance/quote-payments/installments/${second.id}/mark-paid`,payBody(501,pdf));check("folio SII ya usado: rechazado",r.status===409,r.data.message);
r=await as.fin("POST",`/finance/quote-payments/installments/${second.id}/mark-paid`,{...payBody(502,{fileName:"dte.xml",contentBase64:b64(xml(502,clientRut)),mimeType:"application/xml"}),clientVisible:false});check("cuota habilitada pagada con XML del DTE validado",r.status===200&&r.data.siiIssueDate===today&&r.data.clientVisible===false,`${r.status} ${r.data.message??""}`);
r=await as.fin("POST",`/finance/quote-payments/installments/${first.id}/mark-paid`,payBody(509,pdf));check("cuota pagada no se vuelve a pagar",r.status===409,r.status);

// Descarga, edición del plan y tablero
r=await as.cont("GET",`/finance/quote-payments/installments/${first.id}/invoice`);check("descarga autenticada de la factura (contador)",r.status===200&&r.headers.get("content-type")==="application/pdf"&&r.data.toString()==="%PDF-1.4 factura SII 501"&&/attachment/.test(r.headers.get("content-disposition")??""),r.status);
r=await as.ej("PUT",`/finance/quote-payments/quotes/${quoteId}/plan`,{frequency:"MONTHLY",amount:quoteTotal,startDate:`${addMonths(today,-1).slice(0,7)}-01`,paymentDay:1,totalInstallments:3});check("con cuotas pagadas no cambia el día de pago",r.status===409,r.data.message);
r=await as.ej("PUT",`/finance/quote-payments/quotes/${quoteId}/plan`,{frequency:"MONTHLY",amount:150000,startDate:`${addMonths(today,-1).slice(0,7)}-01`,paymentDay:Number(today.slice(8,10)),totalInstallments:4});
check("ampliar plazo y monto: sólo cambian cuotas pendientes",r.status===200&&r.data.installments.length===4&&r.data.installments[0].amount===quoteTotal&&r.data.installments[2].amount===150000,`${r.status} ${r.data.installments?.map((i)=>i.amount).join(",")}`);
r=await as.fin("GET","/finance/quote-payments");check("tablero con KPIs",r.status===200&&r.data.kpis.paidThisMonth===2&&r.data.items.some((i)=>i.quoteId===quoteId),JSON.stringify(r.data.kpis));
r=await as.ej2("GET","/finance/quote-payments");check("tablero de otra ejecutiva no incluye la cotización",r.status===200&&!r.data.items.some((i)=>i.quoteId===quoteId));
r=await as.fin("POST","/finance/scheduler/run-due");check("scheduler extiende calendarios y avisa",r.status===201&&r.data.quotePayments&&!r.data.quotePayments.error,JSON.stringify(r.data.quotePayments));
r=await as.fin("GET","/finance/audit?entityType=QUOTE_PAYMENT_INSTALLMENT");check("auditoría de pagos registrada",r.status===200,r.status);

// Portal cliente: deny by default sin vínculo activo
r=await as.portal("GET","/portal/quote-payments");check("portal sin acceso vinculado: 403",r.status===403,r.status);
r=await as.fin("GET","/portal/quote-payments");check("rol interno no usa rutas del portal: 403",r.status===403,r.status);
console.log(`\n${pass} ✓  ${fail} ✗`);process.exit(fail?1:0);
