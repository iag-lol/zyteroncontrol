import "../../audits.css";
import { AuditWorkspace } from "@/components/audits/audit-workspace";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <AuditWorkspace segments={segments}/>; }
