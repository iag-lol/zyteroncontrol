import { Injectable } from "@nestjs/common";
import type { SupportMessage, SupportTicket } from "@zyteron/contracts";

export interface SupportInboundMessage { provider:string;providerMessageId:string;providerThreadId:string|null;inReplyTo:string|null;references:string[];from:string;subject:string;body:string;receivedAt:string; }
export abstract class SupportChannelProvider { abstract send(ticket:SupportTicket,message:SupportMessage):Promise<{providerMessageId:string;status:"SENT"|"DELIVERY_FAILED"}>; }
@Injectable()
export class DeferredMailSupportProvider extends SupportChannelProvider { async send(){return{providerMessageId:"",status:"DELIVERY_FAILED" as const};} }
@Injectable()
export class SupportCopilotProvider { propose(ticket:SupportTicket,publicMessages:SupportMessage[],articles:Array<{title:string;summary:string}>){const last=publicMessages.at(-1)?.body||ticket.description;return{mode:"DRAFT_ONLY" as const,draft:`Hola, revisamos tu solicitud ${ticket.ticketNumber}. Para continuar necesitamos confirmar: ${last.slice(0,180)}`,missingInformation:["Confirmar alcance y resultado esperado"],suggestedClassification:{ticketType:ticket.ticketType,priority:ticket.priority},sources:[`Ticket ${ticket.ticketNumber}`,...articles.slice(0,3).map(item=>item.title)],warning:"Borrador sujeto a revisión humana; no se envía automáticamente."};} }
