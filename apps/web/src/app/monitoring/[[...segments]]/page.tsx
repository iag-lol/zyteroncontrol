import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HistoryPage, PerformancePage, SslPage, UptimePage } from "@/components/monitoring/analytics";
import { CommandCenter } from "@/components/monitoring/command-center";
import { AlertRulesPage, MaintenancePage } from "@/components/monitoring/config";
import { EndpointDetailPage } from "@/components/monitoring/endpoint-detail";
import { IncidentDetailPage, IncidentsPage } from "@/components/monitoring/incidents";
import { SitesPage } from "@/components/monitoring/sites";
import { StatusBoardPage } from "@/components/monitoring/status-board";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function route(segments: string[]) {
  const [section, id] = segments;
  if (!section) return <CommandCenter />;
  if (segments.length === 1) {
    switch (section) {
      case "websites": case "sites": return <SitesPage />;
      case "live": case "realtime": return <StatusBoardPage />;
      case "incidents": return <IncidentsPage />;
      case "uptime": return <UptimePage />;
      case "performance": return <PerformancePage />;
      case "ssl": return <SslPage />;
      case "maintenance": return <MaintenancePage />;
      case "alert-rules": return <AlertRulesPage />;
      case "history": return <HistoryPage />;
    }
  }
  if (segments.length === 2 && id && uuidPattern.test(id)) {
    if (section === "incidents") return <IncidentDetailPage id={id} />;
    if (section === "endpoints") return <EndpointDetailPage id={id} />;
  }
  notFound();
}

export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  return <Suspense>{route(segments)}</Suspense>;
}
