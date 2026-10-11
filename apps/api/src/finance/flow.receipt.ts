import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
export interface FlowReceipt {
 reference:string; issuer:string; customer:string; document:string; concept:string;
 amount:string; currency:'CLP'; flowOrder:string; paidAt:string; verifiedAt:string; environment:'sandbox'|'production';
}
const forest=rgb(.125,.243,.188),lime=rgb(.77,.91,.55),muted=rgb(.36,.42,.31),line=rgb(.88,.91,.84);
function safe(value:string,max=180){return value.replace(/[^\x20-\x7e\u00a0-\u00ff]/g,' ').slice(0,max);}
export async function createFlowReceipt(receipt:FlowReceipt){
 if(!/^[1-9]\d{0,11}(?:\.00)?$/.test(receipt.amount)||BigInt(receipt.amount.split('.')[0]!)<=0||!receipt.paidAt||!receipt.verifiedAt)throw new Error('RECEIPT_REQUIRES_VERIFIED_PAYMENT');
 const doc=await PDFDocument.create();const stamp=new Date(receipt.verifiedAt);doc.setCreationDate(stamp);doc.setModificationDate(stamp);doc.setTitle('Comprobante de pago Zyteron');doc.setAuthor('Zyteron');doc.setProducer('Zyteron Finance');
 const page=doc.addPage([595.28,841.89]);const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const text=(s:string,x:number,y:number,size=11,strong=false,color=forest)=>page.drawText(safe(s),{x,y,size,font:strong?bold:regular,color});
 const wrap=(s:string,x:number,y:number,width:number,size=11,strong=false)=>{let row='',offset=0;const font=strong?bold:regular;for(const word of safe(s).split(' ')){if(font.widthOfTextAtSize((row?row+' ':'')+word,size)>width&&row){text(row,x,y-offset,size,strong);offset+=16;row=word;}else row+=(row?' ':'')+word;}if(row)text(row,x,y-offset,size,strong);return y-offset-16;};
 page.drawRectangle({x:0,y:670,width:596,height:172,color:forest});text('zyteron.',46,786,28,true,rgb(1,1,1));text('COMPROBANTE DE PAGO',46,748,9,true,lime);text('Pago confirmado',46,710,25,true,rgb(1,1,1));
 if(receipt.environment==='sandbox'){page.drawRectangle({x:46,y:630,width:503,height:28,color:rgb(.96,.93,.84)});text('SANDBOX - DEMOSTRACION - NO ACREDITA UN PAGO REAL',59,640,9,true,muted);}
 text('Referencia',46,598,9,false,muted);text(receipt.reference,46,577,14,true);text('Orden Flow',355,598,9,false,muted);text(receipt.flowOrder,355,577,14,true);
 page.drawLine({start:{x:46,y:552},end:{x:549,y:552},color:line,thickness:1});
 text('EMISOR',46,528,8,true,muted);wrap(receipt.issuer,46,508,245,12,true);text('CLIENTE',324,528,8,true,muted);wrap(receipt.customer,324,508,224,12,true);
 text('DOCUMENTO DE ORIGEN',46,446,8,true,muted);wrap(receipt.document,46,426,500,12,true);text('CONCEPTO',46,389,8,true,muted);wrap(receipt.concept,46,369,500,11);
 page.drawRectangle({x:46,y:264,width:503,height:70,color:rgb(.94,.96,.91)});text('MONTO PAGADO',62,310,8,true,muted);text(new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(receipt.amount))+' CLP',62,282,24,true);
 const date=(v:string)=>new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));
 text('Fecha de pago informada por Flow',46,235,9,false,muted);text(date(receipt.paidAt)+' - America/Santiago',46,217,11);text('Verificacion en el servidor',46,186,9,false,muted);text(date(receipt.verifiedAt)+' - America/Santiago',46,168,11);
 page.drawLine({start:{x:46,y:135},end:{x:549,y:135},color:line,thickness:1});wrap('Este documento confirma el pago verificado con Flow. No es una boleta ni factura tributaria. La factura de origen y su saldo se consultan por separado en Finanzas.',46,112,503,9);
 text('Zyteron - Tecnologia que te acompana',46,45,9,false,muted);text('1 / 1',525,45,8,false,muted);
 return Buffer.from(await doc.save({useObjectStreams:false}));
}
