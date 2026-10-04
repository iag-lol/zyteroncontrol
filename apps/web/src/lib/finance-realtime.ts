import { createClient } from "@supabase/supabase-js";

/** Cambios en tablas financieras publicadas (RLS aplica): pagos → AR, DTE aceptado → estado, conciliación → bancos. */
export function subscribeToFinance(role:string,onChange:(table:string)=>void){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return()=>undefined;
  const client=createClient(url,key);const channel=client.channel(`private:finance:${role}`,{config:{private:true}});
  for(const table of ["invoices","payments","payment_allocations","tax_documents","bank_transactions","journal_entries","finance_notifications","period_close_runs","received_tax_documents","expenses","payables"])channel.on("postgres_changes",{event:"*",schema:"public",table},()=>onChange(table));
  channel.subscribe();return()=>{void client.removeChannel(channel);};
}
