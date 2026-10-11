import { createHash, createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
// Next.js 16 proxy. Each deployed site receives its own resource ID/key; never a financial service key.
const maintenance=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sitio en mantención</title><style>body{margin:0;background:#f3f5ee;color:#203e30;font:16px system-ui;display:grid;min-height:100vh;place-items:center}main{max-width:38rem;padding:3rem}small{letter-spacing:.18em}h1{font-size:clamp(2rem,6vw,3.4rem);line-height:1.06}p{line-height:1.7;color:#546253}</style><main><small>ZYTERON</small><h1>Estamos en modo mantención.</h1><p>Este sitio se encuentra temporalmente en mantención. Puedes contactar a su equipo por los canales habituales.</p></main></html>`;
function signature(method:string,resource:string,body:string){const timestamp=String(Date.now());const key=process.env.ZYTERON_SITE_MODE_KEY;if(!key||!/^[a-f0-9]{64}$/i.test(key))throw new Error('SITE_KEY_REQUIRED');return{'x-zyteron-site-time':timestamp,'x-zyteron-site-signature':createHmac('sha256',Buffer.from(key,'hex')).update(method+'\n'+resource+'\n'+timestamp+'\n'+createHash('sha256').update(body).digest('hex')).digest('hex')};}
export async function proxy(_request:NextRequest){
 const resource=process.env.ZYTERON_SITE_RESOURCE_ID,base=process.env.ZYTERON_SITE_CONTROL_ORIGIN;
 // Installing the template alone has no effect. Enable only after binding this exact resource in Control.
 if(process.env.ZYTERON_SITE_MODE_ENABLED!=='true')return NextResponse.next();
 try{if(!resource||!/^site-[a-z0-9-]{3,80}$/.test(resource)||!base)throw new Error();const origin=new URL(base);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.hash||origin.search||origin.port)throw new Error();const endpoint=new URL('/api/site-mode/'+resource,origin);
  const response=await fetch(endpoint,{headers:signature('GET',resource,''),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error();const value=await response.json();if(value.resourceId!==resource||!['ACTIVE','MAINTENANCE'].includes(value.mode)||!Number.isSafeInteger(value.generation))throw new Error();if(value.mode==='ACTIVE')return NextResponse.next();
  const body=JSON.stringify({mode:'MAINTENANCE',generation:value.generation});const ack=await fetch(new URL(endpoint.toString()+'/ack'),{method:'POST',headers:{...signature('POST',resource,body),'content-type':'application/json'},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)});
  if(!ack.ok)throw new Error();return new NextResponse(maintenance,{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','retry-after':'300','x-robots-tag':'noindex','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
 }catch{
  // A Control/network failure is never mistaken for an approved client cancellation.
  // Explicitly return 503 (no content exposure), with no acknowledgement or financial mutation.
  return new NextResponse('Verificación temporalmente no disponible. Intenta nuevamente.',{status:503,headers:{'cache-control':'no-store','retry-after':'30'}});
 }
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|healthz).*)']};
