import "../../audits.css";
import { AuditWorkspace } from "@/components/audits/audit-workspace";
export default async function Page({ params, searchParams }: { params: Promise<{ segments?: string[] }>; searchParams: Promise<{ clientId?: string }> }) { const [{ segments = [] }, query] = await Promise.all([params, searchParams]); return <AuditWorkspace segments={segments} initialClientId={query.clientId || null}/>; }
