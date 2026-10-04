import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EnterpriseShell } from "@/components/enterprise-shell";
import "./globals.css";
import "./settings.css";

export const metadata: Metadata = {
  title: "Zyteron Control",
  description: "Centro de control operacional de Zyteron",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body><EnterpriseShell>{children}</EnterpriseShell></body>
    </html>
  );
}
