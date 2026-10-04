import { BadRequestException } from "@nestjs/common";
import { deflateRawSync, inflateRawSync } from "node:zlib";

// =========================================================================================== XML seguro
// Parser mínimo sin resolución de entidades externas: rechaza DOCTYPE/ENTITY (XXE y "billion laughs").
export interface XmlNode { name:string; attrs:Record<string,string>; children:XmlNode[]; text:string; }
const MAX_XML_BYTES=8*1024*1024,MAX_DEPTH=64;
const decodeEntities=(value:string)=>value.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi,(_,entity:string)=>{const key=entity.toLowerCase();if(key==="lt")return"<";if(key==="gt")return">";if(key==="amp")return"&";if(key==="quot")return"\"";if(key==="apos")return"'";const code=key.startsWith("#x")?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return Number.isFinite(code)&&code>0&&code<0x110000?String.fromCodePoint(code):"";});
export function parseXml(input:string|Buffer):XmlNode{
  const source=typeof input==="string"?input:decodeXmlBuffer(input);
  if(Buffer.byteLength(source)>MAX_XML_BYTES)throw new BadRequestException("El XML excede el tamaño permitido.");
  if(/<!DOCTYPE|<!ENTITY/i.test(source))throw new BadRequestException("XML rechazado: DOCTYPE/ENTITY no están permitidos.");
  const root:XmlNode={name:"#document",attrs:{},children:[],text:""};const stack=[root];let index=0;
  while(index<source.length){
    const open=source.indexOf("<",index);
    if(open<0){stack[stack.length-1]!.text+=decodeEntities(source.slice(index));break;}
    if(open>index)stack[stack.length-1]!.text+=decodeEntities(source.slice(index,open));
    if(source.startsWith("<?",open)){const end=source.indexOf("?>",open);if(end<0)throw new BadRequestException("XML mal formado.");index=end+2;continue;}
    if(source.startsWith("<!--",open)){const end=source.indexOf("-->",open);if(end<0)throw new BadRequestException("XML mal formado.");index=end+3;continue;}
    if(source.startsWith("<![CDATA[",open)){const end=source.indexOf("]]>",open);if(end<0)throw new BadRequestException("XML mal formado.");stack[stack.length-1]!.text+=source.slice(open+9,end);index=end+3;continue;}
    const close=findTagEnd(source,open);const tag=source.slice(open+1,close);
    if(tag.startsWith("/")){const name=tag.slice(1).trim();const node=stack.pop();if(!node||node.name!==name||stack.length===0)throw new BadRequestException(`XML mal formado cerca de </${name}>.`);index=close+1;continue;}
    const selfClosing=tag.endsWith("/");const body=selfClosing?tag.slice(0,-1):tag;const nameMatch=/^([^\s/>]+)/.exec(body);if(!nameMatch)throw new BadRequestException("XML mal formado.");
    const attrs:Record<string,string>={};const attrPattern=/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;let attr:RegExpExecArray|null;const rest=body.slice(nameMatch[1]!.length);
    while((attr=attrPattern.exec(rest)))attrs[attr[1]!]=decodeEntities(attr[3]??attr[4]??"");
    const node:XmlNode={name:nameMatch[1]!,attrs,children:[],text:""};stack[stack.length-1]!.children.push(node);
    if(!selfClosing){stack.push(node);if(stack.length>MAX_DEPTH)throw new BadRequestException("XML con anidamiento excesivo.");}
    index=close+1;
  }
  if(stack.length!==1)throw new BadRequestException("XML incompleto.");
  const element=root.children[0];if(!element||root.children.length!==1)throw new BadRequestException("XML sin elemento raíz único.");return element;
}
function findTagEnd(source:string,start:number){let quote:string|null=null;for(let i=start+1;i<source.length;i++){const char=source[i];if(quote){if(char===quote)quote=null;}else if(char==="\""||char==="'")quote=char;else if(char===">")return i;}throw new BadRequestException("XML mal formado (etiqueta sin cierre).");}
function decodeXmlBuffer(buffer:Buffer){const head=buffer.subarray(0,200).toString("latin1");return /encoding=["']ISO-8859-1["']/i.test(head)?buffer.toString("latin1"):buffer.toString("utf8");}
export const local=(name:string)=>name.includes(":")?name.slice(name.indexOf(":")+1):name;
export function child(node:XmlNode|undefined,name:string){return node?.children.find((item)=>local(item.name)===name);}
export function children(node:XmlNode|undefined,name:string){return node?.children.filter((item)=>local(item.name)===name)??[];}
export function path(node:XmlNode|undefined,...names:string[]){let current=node;for(const name of names)current=child(current,name);return current;}
export function textOf(node:XmlNode|undefined,...names:string[]){const target=names.length?path(node,...names):node;return target?target.text.trim():"";}
export function descendants(node:XmlNode,name:string,out:XmlNode[]=[]){for(const item of node.children){if(local(item.name)===name)out.push(item);descendants(item,name,out);}return out;}
export const escapeXml=(value:unknown)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");

// =========================================================================================== CSV
export function parseCsv(input:string|Buffer){
  let text=typeof input==="string"?input:input.toString("utf8");if(text.charCodeAt(0)===0xfeff)text=text.slice(1);
  if(text.includes("�")&&Buffer.isBuffer(input))text=input.toString("latin1");
  const firstLine=text.split(/\r?\n/,1)[0]??"";const delimiter=[";",",","\t"].map((d)=>[d,firstLine.split(d).length] as const).sort((a,b)=>b[1]-a[1])[0]![0];
  const rows:string[][]=[];let row:string[]=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){const char=text[i]!;
    if(quoted){if(char==="\""){if(text[i+1]==="\""){field+="\"";i++;}else quoted=false;}else field+=char;continue;}
    if(char==="\"")quoted=true;else if(char===delimiter){row.push(field);field="";}else if(char==="\n"||char==="\r"){if(char==="\r"&&text[i+1]==="\n")i++;row.push(field);field="";if(row.some((cell)=>cell.trim()!==""))rows.push(row);row=[];}else field+=char;}
  row.push(field);if(row.some((cell)=>cell.trim()!==""))rows.push(row);
  return rows.map((cells)=>cells.map((cell)=>cell.trim()));
}
const csvCell=(value:unknown)=>{const text=value===null||value===undefined?"":String(value);const safe=/^[=+\-@\t\r]/.test(text)&&!/^-?\d+([.,]\d+)?$/.test(text)?`'${text}`:text;return /[";\n\r]/.test(safe)?`"${safe.replace(/"/g,"\"\"")}"`:safe;};
/** CSV para Excel en es-CL (separador `;`, BOM UTF-8). Neutraliza fórmulas (CSV injection). */
export function writeCsv(headers:string[],rows:unknown[][]){return Buffer.from(String.fromCharCode(0xfeff)+[headers,...rows].map((row)=>row.map(csvCell).join(";")).join("\r\n"),"utf8");}

// =========================================================================================== ZIP / XLSX
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function crc32(buffer:Buffer){let crc=0xffffffff;for(const byte of buffer)crc=crcTable[(crc^byte)&0xff]!^(crc>>>8);return(crc^0xffffffff)>>>0;}
export function readZip(buffer:Buffer){
  const entries=new Map<string,Buffer>();let eocd=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){eocd=i;break;}
  if(eocd<0)throw new BadRequestException("Archivo XLSX inválido.");
  const count=buffer.readUInt16LE(eocd+10);let offset=buffer.readUInt32LE(eocd+16);let total=0;
  for(let n=0;n<count;n++){
    if(buffer.readUInt32LE(offset)!==0x02014b50)throw new BadRequestException("Archivo XLSX inválido.");
    const method=buffer.readUInt16LE(offset+10),compressed=buffer.readUInt32LE(offset+20),size=buffer.readUInt32LE(offset+24),nameLength=buffer.readUInt16LE(offset+28),extra=buffer.readUInt16LE(offset+30),comment=buffer.readUInt16LE(offset+32),localOffset=buffer.readUInt32LE(offset+42);
    const name=buffer.subarray(offset+46,offset+46+nameLength).toString("utf8");total+=size;if(total>50*1024*1024)throw new BadRequestException("XLSX demasiado grande al descomprimir.");
    const localName=buffer.readUInt16LE(localOffset+26),localExtra=buffer.readUInt16LE(localOffset+28);const start=localOffset+30+localName+localExtra;const data=buffer.subarray(start,start+compressed);
    entries.set(name,method===0?Buffer.from(data):inflateRawSync(data));offset+=46+nameLength+extra+comment;
  }
  return entries;
}
export function writeZip(files:Array<{name:string;data:Buffer}>){
  const locals:Buffer[]=[],centrals:Buffer[]=[];let offset=0;
  for(const file of files){const name=Buffer.from(file.name,"utf8");const compressed=deflateRawSync(file.data);const crc=crc32(file.data);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x0800,6);header.writeUInt16LE(8,8);header.writeUInt32LE(0,10);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(file.data.length,22);header.writeUInt16LE(name.length,26);header.writeUInt16LE(0,28);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x0800,8);central.writeUInt16LE(8,10);central.writeUInt32LE(0,12);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(file.data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
    locals.push(header,name,compressed);centrals.push(central,name);offset+=30+name.length+compressed.length;}
  const centralSize=centrals.reduce((total,item)=>total+item.length,0);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,...centrals,end]);
}
const columnIndex=(ref:string)=>{const letters=/^[A-Z]+/.exec(ref)?.[0]??"A";let index=0;for(const letter of letters)index=index*26+(letter.charCodeAt(0)-64);return index-1;};
/** Lee la primera hoja de un XLSX como matriz de texto (números como texto, fechas como serial Excel). */
export function readXlsx(buffer:Buffer):string[][]{
  const zip=readZip(buffer);const xml=(name:string)=>{const data=zip.get(name);return data?parseXml(data.toString("utf8")):undefined;};
  const shared=(()=>{const doc=xml("xl/sharedStrings.xml");return doc?children(doc,"si").map((si)=>descendants(si,"t").map((t)=>t.text).join("")):[];})();
  const workbook=xml("xl/workbook.xml");const firstSheet=child(child(workbook,"sheets"),"sheet");const relId=firstSheet?.attrs["r:id"];
  const rels=xml("xl/_rels/workbook.xml.rels");const target=rels?.children.find((rel)=>rel.attrs.Id===relId)?.attrs.Target??"worksheets/sheet1.xml";
  const sheet=xml(`xl/${target.replace(/^\/?xl\//,"")}`);if(!sheet)throw new BadRequestException("El XLSX no contiene hojas legibles.");
  const rows:string[][]=[];for(const row of children(child(sheet,"sheetData"),"row")){const cells:string[]=[];for(const cell of children(row,"c")){const type=cell.attrs.t;const value=type==="inlineStr"?descendants(cell,"t").map((t)=>t.text).join(""):textOf(cell,"v");cells[columnIndex(cell.attrs.r??"A")]=type==="s"?shared[Number(value)]??"":value;}
    const filled=Array.from({length:cells.length},(_,i)=>(cells[i]??"").trim());if(filled.some((cell)=>cell!==""))rows.push(filled);}
  return rows;
}
const colName=(index:number)=>{let name="";let n=index+1;while(n>0){const rest=(n-1)%26;name=String.fromCharCode(65+rest)+name;n=Math.floor((n-1)/26);}return name;};
export function writeXlsx(sheetName:string,headers:string[],rows:unknown[][]){
  const cell=(value:unknown,ref:string)=>typeof value==="number"&&Number.isFinite(value)?`<c r="${ref}"><v>${value}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value??"")}</t></is></c>`;
  const sheetRows=[headers,...rows].map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>cell(value,`${colName(c)}${r+1}`)).join("")}</row>`).join("");
  const files=[
    {name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`},
    {name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName.slice(0,31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`},
    {name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`},
    {name:"xl/worksheets/sheet1.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`},
  ];
  return writeZip(files.map((file)=>({name:file.name,data:Buffer.from(file.data,"utf8")})));
}

// =========================================================================================== PDF de informes
const winAnsi:Record<string,number>={"€":0x80,"‚":0x82,"„":0x84,"…":0x85,"‘":0x91,"’":0x92,"“":0x93,"”":0x94,"•":0x95,"–":0x96,"—":0x97,"™":0x99};
function pdfText(value:string){const bytes:number[]=[];for(const char of value){const code=char.codePointAt(0)!;const mapped=winAnsi[char]??(code<256?code:63);if(mapped===0x28||mapped===0x29||mapped===0x5c)bytes.push(0x5c);bytes.push(mapped);}return Buffer.from(bytes).toString("latin1");}
export interface PdfReportInput { title:string; headerLines:string[]; columns:Array<{label:string;width:number;align?:"left"|"right"}>; rows:string[][]; summary?:string[]; footer:string; }
/** Informe tabular A4 apaisado con Helvetica (sin dependencias). Encabezado y pie obligatorios en cada página. */
export function renderPdfReport(input:PdfReportInput){
  const width=842,height=595,margin=36,lineHeight=12,fontSize=7.5;const usable=width-margin*2;const totalWidth=input.columns.reduce((t,c)=>t+c.width,0);const scale=usable/totalWidth;
  const pages:string[]=[];let ops:string[]=[];let y=0;
  const text=(x:number,yy:number,value:string,size=fontSize,bold=false)=>ops.push(`BT /${bold?"F2":"F1"} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${pdfText(value)}) Tj ET`);
  const fit=(value:string,cellWidth:number)=>{const max=Math.max(3,Math.floor(cellWidth/(fontSize*0.5)));return value.length>max?value.slice(0,max-1)+"…":value;};
  const header=()=>{ops=[];y=height-margin;text(margin,y,input.title,13,true);y-=16;for(const line of input.headerLines){text(margin,y,line,8);y-=11;}y-=4;ops.push(`0.86 0.93 0.62 rg ${margin} ${y-3} ${usable} ${lineHeight+2} re f 0 0 0 rg`);let x=margin;for(const column of input.columns){const w=column.width*scale;text(column.align==="right"?x+w-4-column.label.length*fontSize*0.5:x+3,y,fit(column.label,w),fontSize,true);x+=w;}y-=lineHeight+2;};
  const footer=(page:number)=>{text(margin,margin-14,`${input.footer}  ·  Página ${page}`,7);};
  header();
  for(const row of input.rows){if(y<margin+lineHeight){footer(pages.length+1);pages.push(ops.join("\n"));header();}let x=margin;input.columns.forEach((column,i)=>{const w=column.width*scale;const value=fit(row[i]??"",w);text(column.align==="right"?Math.max(x+2,x+w-4-value.length*fontSize*0.48):x+3,y,value);x+=w;});y-=lineHeight;}
  if(input.summary?.length){y-=6;for(const line of input.summary){if(y<margin+lineHeight){footer(pages.length+1);pages.push(ops.join("\n"));header();}text(margin,y,line,8.5,true);y-=12;}}
  footer(pages.length+1);pages.push(ops.join("\n"));
  const objects:string[]=[];const add=(body:string)=>{objects.push(body);return objects.length;};
  const catalog=add("");const pagesId=add("");const f1=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");const f2=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds:number[]=[];for(const content of pages){const stream=add(`<< /Length ${Buffer.byteLength(content,"latin1")} >>\nstream\n${content}\nendstream`);pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${stream} 0 R >>`));}
  objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map((id)=>`${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let out="%PDF-1.4\n";const offsets:number[]=[];objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(out,"latin1"));out+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const xref=Buffer.byteLength(out,"latin1");out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.map((o)=>`${String(o).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out,"latin1");
}
