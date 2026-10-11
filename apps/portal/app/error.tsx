'use client';
import { AlertCircle } from 'lucide-react';
export default function ErrorPage({reset}:{reset:()=>void}) {return <main className="standalone-state"><AlertCircle size={35}/><h1>No pudimos abrir esta vista.</h1><p>Vuelve a intentarlo. Tus datos no se han enviado.</p><button className="button primary" onClick={reset}>Reintentar</button></main>;}
