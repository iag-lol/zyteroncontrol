import Link from 'next/link';
import { FolderSearch } from 'lucide-react';
export default function NotFound(){return <main className="standalone-state"><FolderSearch size={35}/><p className="eyebrow">PORTAL CLIENTE ZYTERON</p><h1>Esta página no está disponible.</h1><p>Regresa a tu espacio para seguir explorando.</p><Link href="/demo" className="button primary">Volver al inicio</Link></main>;}
