import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
function unavailable() {
  return NextResponse.json({ error: { code: 'PORTAL_NOT_CONNECTED', message: 'El portal aún no está conectado a Zyteron Control.', request_id: crypto.randomUUID() } }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
}
export const GET = unavailable;
export const POST = unavailable;
export const PATCH = unavailable;
export const PUT = unavailable;
export const DELETE = unavailable;
