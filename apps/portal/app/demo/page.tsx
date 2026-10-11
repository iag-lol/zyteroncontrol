import Portal from '@/components/portal';
export default async function Demo({searchParams}:{searchParams:Promise<{seccion?:string}>}) { const {seccion}=await searchParams; return <Portal initialSection={seccion}/>; }
