import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { ClientContract } from "@zyteron/contracts";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { chileanContractTemplates } from "./contract-template-catalog.js";

const width=595.28,height=841.89,left=54,right=541;
const navy=rgb(.035,.075,.17),blue=rgb(.055,.35,.93),teal=rgb(.02,.72,.68),slate=rgb(.29,.36,.47),line=rgb(.84,.88,.93);
const normalize=(value:string)=>value.replaceAll("\u00a0"," ").replaceAll("—","-").replaceAll("“",'"').replaceAll("”",'"').replaceAll("’","'").replaceAll("N.º","N.o");
const flat=(source:Record<string,unknown>,prefix=""):Record<string,string>=>Object.entries(source).reduce<Record<string,string>>((acc,[key,value])=>{const path=prefix?`${prefix}.${key}`:key;if(value&&typeof value==="object"&&!Array.isArray(value))Object.assign(acc,flat(value as Record<string,unknown>,path));else acc[path]=Array.isArray(value)?value.map(item=>typeof item==="object"?JSON.stringify(item):String(item)).join("\n"):String(value??"");return acc;},{});
const wrap=(value:string,font:PDFFont,size:number,max:number)=>{const words=normalize(value).split(/\s+/).filter(Boolean),lines:string[]=[];let current="";for(const word of words){const next=current?`${current} ${word}`:word;if(font.widthOfTextAtSize(next,size)<=max){current=next;continue;}if(current)lines.push(current);let fragment="";for(const char of word){if(font.widthOfTextAtSize(fragment+char,size)>max){if(fragment)lines.push(fragment);fragment=char;}else fragment+=char;}current=fragment;}if(current)lines.push(current);return lines.length?lines:[""];};

export function renderContractText(contract:ClientContract){
  const selected=new Set(contract.templateCodes??["ZT-PROYECTO-CL","ZT-CONDICIONES-CL"]),values=flat(contract.builderValues??{});
  values["contrato.numero"]||=contract.contractNumber;
  const sections=chileanContractTemplates.filter(template=>selected.has(template.code)).map(template=>{
    let body=template.body;
    if(template.code==="ZT-CONDICIONES-CL")body=selectIpMode(body,values["pi.modalidad"]);
    for(const[key,value]of Object.entries(values))body=body.replaceAll(`{{${key}}}`,value);
    return{code:template.code,name:template.name,text:body};
  });
  return sections;
}

function selectIpMode(body:string,mode?:string){
  const normalized=(mode??"").toUpperCase();
  if(!["A","B","C"].includes(normalized))return body;
  const labels=["A","B","C"];
  for(const label of labels)if(label!==normalized){const start=body.indexOf(`MODALIDAD ${label} —`);if(start>=0){const candidates=[...labels.filter(value=>value!==label).map(value=>body.indexOf(`MODALIDAD ${value} —`,start+1)),body.indexOf("REGLA APLICABLE A TODAS LAS MODALIDADES.",start+1)].filter(value=>value>start);const end=Math.min(...candidates);body=body.slice(0,start)+body.slice(end);}}
  return body.replace("INSTRUCCIÓN DEL GENERADOR:\nSeleccionar UNA modalidad y retirar las demás del PDF.\n\n","");
}

@Injectable()
export class ContractDocumentService{
  preview(contract:ClientContract){
    const sections=renderContractText(contract),unresolved=[...new Set(sections.flatMap(section=>[...section.text.matchAll(/\{\{([^}]+)\}\}/g)].map(match=>match[1])))];
    const html=sections.map(section=>`<section data-template="${section.code}"><h1>${escape(section.name)}</h1>${section.text.split(/\n{2,}/).map(paragraph=>`<p>${escape(paragraph).replaceAll("\n","<br>")}</p>`).join("")}</section>`).join("");
    return{html,sections,unresolved,watermark:"BORRADOR — REVISIÓN LEGAL REQUERIDA"};
  }

  async render(contract:ClientContract){
    const {sections,unresolved}=this.preview(contract);const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);const pages:PDFPage[]=[];
    const page=()=>{const p=pdf.addPage([width,height]);pages.push(p);p.drawRectangle({x:0,y:height-6,width:width*.45,height:6,color:teal});p.drawRectangle({x:width*.45,y:height-6,width:width*.55,height:6,color:blue});p.drawText("ZYTERON CONTROL",{x:left,y:height-39,font:bold,size:10,color:navy});p.drawText(contract.contractNumber,{x:right-bold.widthOfTextAtSize(contract.contractNumber,10),y:height-39,font:bold,size:10,color:navy});p.drawLine({start:{x:left,y:height-51},end:{x:right,y:height-51},color:line,thickness:.7});return p;};
    let current=page(),y=height-76;
    const draw=(text:string,font:PDFFont,size:number,leading:number,color=slate)=>{const lines=wrap(text,font,size,right-left);for(const value of lines){if(y<66){current=page();y=height-76;}current.drawText(value,{x:left,y,font,size,color});y-=leading;}y-=leading*.35;};
    for(const section of sections){if(y<130){current=page();y=height-76;}draw(section.name.toUpperCase(),bold,12,16,navy);current.drawText(section.code,{x:left,y,font:bold,size:7.5,color:blue});y-=18;for(const paragraph of section.text.split(/\n{2,}/)){const trimmed=paragraph.trim();if(!trimmed)continue;const heading=/^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA|UNDÉCIMA|DUODÉCIMA|DECIMO|VIGÉSIMA|VIGESIMO|FIRMAS|\d+\.)/.test(trimmed);draw(trimmed,heading?bold:regular,heading?9:8.3,heading?12.5:11.2,heading?navy:slate);}}
    pages.forEach((p,index)=>{const footer=`${contract.contractNumber} · Página ${index+1} de ${pages.length}`;p.drawLine({start:{x:left,y:43},end:{x:right,y:43},color:line,thickness:.6});p.drawText(footer,{x:left,y:28,font:regular,size:7,color:slate});p.drawText("Documento contractual generado electrónicamente",{x:right-regular.widthOfTextAtSize("Documento contractual generado electrónicamente",7),y:28,font:regular,size:7,color:slate});});
    pdf.setTitle(`${contract.contractNumber} · ${contract.name}`);pdf.setAuthor("Zyteron SpA");pdf.setCreator("Zyteron Control · ContractDocumentService");const bytes=Buffer.from(await pdf.save()),hash=createHash("sha256").update(bytes).digest("hex");return{bytes,hash,filename:`${contract.contractNumber}-v${contract.version}.pdf`,unresolved};
  }
}

function escape(value:string){return value.replace(/[<>&"']/g,char=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;"}[char]!));}
