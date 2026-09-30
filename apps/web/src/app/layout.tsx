import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EnterpriseShell } from "@/components/enterprise-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zyteron Control",
  description: "Centro de control operacional de Zyteron",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body><EnterpriseShell>{children}</EnterpriseShell></body>
    </html>
  );
}
