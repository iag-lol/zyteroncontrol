import { Client360 } from "@/components/clients/client-360";
import { ClientHub } from "@/components/clients/client-hub";
import { NewClientWizard } from "@/components/clients/new-client-wizard";
import { ModulePage } from "@/components/module-page";
import { notFound } from "next/navigation";
import { ContactDirectory } from "@/components/clients/contact-directory";
import { ContractCenter, ContractDetail } from "@/components/clients/contract-center";
import { ServiceDetail, ServiceOperations } from "@/components/clients/service-operations";
import { RenewalCenter } from "@/components/clients/renewal-center";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  if (!segments.length) return <ClientHub />;
  if (segments[0] === "new") return <NewClientWizard />;
  if (segments[0] === "360") return <ClientHub />;
  if (segments[0] === "contacts" && segments.length === 1) return <ContactDirectory />;
  if (segments[0] === "contracts" && segments.length === 1) return <ContractCenter />;
  if (segments[0] === "contracts" && uuidPattern.test(segments[1] ?? "")) return <ContractDetail id={segments[1]!} />;
  if (segments[0] === "services" && uuidPattern.test(segments[1] ?? "")) return <ServiceDetail id={segments[1]!} />;
  if (segments[0] === "services" && segments.length === 1) return <ServiceOperations />;
  if (segments[0] === "renewals" && segments.length === 1) return <RenewalCenter />;
  if (["contacts", "contracts", "services", "renewals"].includes(segments[0]!)) return <ModulePage pathname={`/clients/${segments[0]}`} />;
  if (!uuidPattern.test(segments[0]!)) notFound();
  return <Client360 id={segments[0]!} initialTab={segments[1]} />;
}
