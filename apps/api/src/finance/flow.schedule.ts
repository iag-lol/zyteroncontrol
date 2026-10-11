import { BadRequestException } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
/** Bind recurring charges to the next canonical due date and the finite contract end. */
export function flowSchedule(start:string,end:string|null,today=Temporal.Now.plainDateISO('America/Santiago').toString()){
 try{const first=Temporal.PlainDate.from(start),last=end?Temporal.PlainDate.from(end):null,now=Temporal.PlainDate.from(today);if(first.day>28||first.toString()!==start||!last||last.toString()!==end||Temporal.PlainDate.compare(first,now)<=0||Temporal.PlainDate.compare(last,first)<0)throw new Error();let periods=0;while(periods<120&&Temporal.PlainDate.compare(first.add({months:periods}),last)<=0)periods++;if(!periods||periods===120)throw new Error();return{start:first.toString(),end:last.toString(),periods};}catch{throw new BadRequestException('El cobro mensual requiere una próxima fecha futura y término de contrato válidos (máximo 119 períodos).');}
}
