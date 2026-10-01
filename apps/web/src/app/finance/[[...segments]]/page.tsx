import { FinanceWorkspace } from "@/components/finance/finance-workspace";
import "../../finance.css";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <FinanceWorkspace segments={segments} />; }
