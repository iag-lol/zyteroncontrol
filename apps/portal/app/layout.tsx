import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Portal Cliente · Zyteron', description: 'Tu empresa, tus proyectos y tu equipo Zyteron. Vista previa de diseño.', robots: { index: false, follow: false } };
export default function Layout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="es-CL"><body>{children}</body></html>; }
