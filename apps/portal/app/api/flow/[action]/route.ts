import { NextResponse } from 'next/server';
import { error,flowBackend,grantToken,setGrant,clearGrant,validOrigin } from '@/lib/server/flow-bff';
export const dynamic='force-dynamic';
function emptyResponse(location='/payments'){return new NextResponse(null,{status:303,headers:{location,'cache-control':'private, no-store'}});}
async function limitedBody(request:Request){const reader=request.body?.getReader();if(!reader)return '';let size=0;const chunks:Uint8Array[]=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(chunks.flatMap(c=>Array.from(c))));}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const{action}=await params;
 try{
  if(Number(request.headers.get('content-length')??0)>2048)return error('Solicitud fuera de límites.',413);
  if(action==='return'||action==='registration-return'){
   if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return error('Retorno de pago inválido.',400);
   const raw=await limitedBody(request);if(raw.length>2048)return error('Retorno de pago inválido.',413);const fields=new URLSearchParams(raw);const token=fields.get('token');if(fields.size!==1||!token||!/^[A-Za-z0-9_-]{12,200}$/.test(token))return error('Retorno de pago inválido.',400);
   const response=await flowBackend(action,{token});if(action==='registration-return'){const redirect=emptyResponse('/payments/registro');clearGrant(redirect);return redirect;}if(!response.ok){const redirect=emptyResponse();clearGrant(redirect);return redirect;}const value=await response.json();const redirect=emptyResponse();clearGrant(redirect);await setGrant(redirect,value);return redirect;
  }
  if(!validOrigin(request))return error('No pudimos validar el origen de la solicitud.',403);
  const raw=await limitedBody(request);if(raw.length>2048)return error('Solicitud fuera de límites.',413);const body=JSON.parse(raw||'{}') as Record<string,unknown>;if(!body||typeof body!=='object'||Array.isArray(body))return error('Solicitud inválida.',400);
  if(action==='open'){
   if(Object.keys(body).some(k=>k!=='linkToken')||typeof body.linkToken!=='string')return error('Solicitud inválida.',400);const response=await flowBackend('open',body);if(!response.ok)return error('El enlace de pago no está disponible.',response.status);const result=NextResponse.json({opened:true});await setGrant(result,await response.json());return result;
  }
  if(!['start','refresh'].includes(action)||Object.keys(body).some(k=>k!=='idempotencyKey'))return error('Solicitud inválida.',400);
  const token=await grantToken();if(!token)return error('Necesitas un enlace de pago autorizado.',401);
  const response=await flowBackend(action,{grantToken:token,...(action==='start'?{idempotencyKey:body.idempotencyKey}:{})});if(!response.ok)return error('La operación no está disponible. Consulta el estado antes de reintentar.',response.status);return NextResponse.json(await response.json(),{headers:{'cache-control':'private, no-store'}});
 }catch{if(action==='return'||action==='registration-return'){const redirect=emptyResponse(action==='return'?'/payments':'/payments/registro');clearGrant(redirect);return redirect;}return error('La conexión de pagos aún no está habilitada o necesita revisión.');}
}
export async function GET(_request:Request,{params}:{params:Promise<{action:string}>}){const{action}=await params;if(!['status','receipt'].includes(action))return error('Ruta no disponible.',404);try{const token=await grantToken();if(!token)return error('Necesitas un enlace de pago autorizado.',401);const response=await flowBackend(action==='status'?'view':'receipt',{grantToken:token});if(!response.ok)return error('No hay un comprobante confirmado disponible.',response.status);if(action==='receipt'){if(!response.headers.get('content-type')?.startsWith('application/pdf'))return error('El comprobante todavía no está listo.');return new NextResponse(await response.arrayBuffer(),{headers:{'cache-control':'private, no-store','content-type':'application/pdf','content-disposition':'attachment; filename="comprobante-zyteron.pdf"'}});}return NextResponse.json(await response.json(),{headers:{'cache-control':'private, no-store'}});}catch{return error('La conexión de pagos aún no está habilitada.');}}
