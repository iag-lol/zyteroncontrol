import { OperationsWorkspace } from "@/components/operations/operations-workspace";
export default async function Page({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) { const query = await searchParams; return <OperationsWorkspace section="work-orders" initialClientId={query.clientId || null}/>; }
