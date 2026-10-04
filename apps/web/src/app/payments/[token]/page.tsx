import { PublicPayment } from "@/components/finance/public-payment";
import "../../finance.css";
export const metadata = { title: "Pago de documento · Zyteron", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <PublicPayment token={token} />; }
