import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';

const sections: Record<string,string> = {inicio:'Hola, María',servicios:'Mis servicios',proyectos:'Proyectos',cuenta:'Estado de cuenta',pagos:'Pagos y facturas',contratos:'Cotizaciones y contratos',documentos:'Documentos',credenciales:'Credenciales',asistencia:'Asistencia técnica',monitoreo:'Monitoreo',informes:'Informes y mantenciones',agenda:'Agenda',notificaciones:'Notificaciones',empresa:'Mi empresa',perfil:'Mi perfil y seguridad'};
test('all private API families reject impersonation and mutations without returning data', async ({request}) => {
  for(const endpoint of ['me','organizations','home','projects/other-tenant','account/summary','support/tickets','documents/other/download','credentials/other/reveal','payment-intents']) {
    for(const method of ['GET','POST','PATCH','DELETE']) {
      const response=await request.fetch(`/api/client/${endpoint}`,{method,headers:{'x-zyteron-role':'GERENTE_GENERAL','x-zyteron-client-id':'other-tenant','x-zyteron-user-id':'fake-user',cookie:'portal_session=fake'}});
      expect(response.status()).toBe(503);
      expect(response.headers()['cache-control']).toContain('no-store');
      const body=await response.json();expect(body.error.code).toBe('PORTAL_NOT_CONNECTED');expect(body.error.request_id).toBeTruthy();expect(body.data).toBeUndefined();
    }
  }
});
test('all 15 sections load without horizontal overflow from 320 to 2560 px',async({page})=>{
  for(const width of [320,375,390,768,1024,1440,2560]){
    await page.setViewportSize({width,height:950});
    for(const [id,title] of Object.entries(sections)){
      await page.goto(`/demo?seccion=${id}`);
      await expect(page.getByRole('heading',{level:1})).toContainText(title);
      const bounds=await page.evaluate(()=>({window:innerWidth,body:document.documentElement.scrollWidth}));
      expect(bounds.body,`${id} overflows at ${width}px`).toBeLessThanOrEqual(bounds.window+1);
    }
  }
});
test('support drafts preserve content across close and reopen and never send a ticket',async({page})=>{
  let requests=0;page.on('request',r=>{if(r.url().includes('/api/client/')&&r.method()==='POST')requests++;});
  await page.goto('/demo');await page.getByRole('button',{name:'Nueva solicitud',exact:true}).click();
  await page.getByLabel('Asunto',{exact:true}).fill('Solicitud sintética de revisión');
  await page.getByLabel('Cuéntanos un poco más',{exact:true}).fill('Necesitamos revisar el horario en un ejemplo de nuestro sitio.');
  await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
  await page.getByRole('button',{name:'Nueva solicitud',exact:true}).click();
  await expect(page.getByLabel('Asunto',{exact:true})).toHaveValue('Solicitud sintética de revisión');
  await page.getByRole('button',{name:'Guardar borrador demo',exact:true}).click();
  await expect(page.getByRole('button',{name:/BOR-001/})).toContainText('Borrador · No enviado');
  expect(requests).toBe(0);
});
test('financial actions stay blocked and exports are explicitly synthetic',async({page})=>{
  await page.goto('/demo?seccion=cuenta');await expect(page.getByRole('heading',{level:1})).toHaveText('Estado de cuenta');
  await page.getByRole('button',{name:'Ver factura F-1024',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('No es una factura tributaria');
  await page.getByRole('button',{name:'Opciones de pago',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('están deshabilitados');await expect(page.getByRole('dialog')).not.toContainText(/flow/i);
  await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV demo',exact:true}).click();expect((await downloaded).suggestedFilename()).toBe('estado-de-cuenta-DEMO.csv');
});
test('search, empty state, keyboard dismissal and notification read state work',async({page})=>{
  await page.goto('/demo');await page.getByRole('button',{name:'Buscar en tu portal',exact:true}).click();
  await page.getByLabel('Buscar proyectos, servicios o documentos').fill('no-hay-este-documento');await expect(page.getByRole('dialog')).toContainText('Sin resultados');
  await page.getByLabel('Buscar proyectos, servicios o documentos').press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/demo?seccion=notificaciones');await expect(page.getByRole('heading',{level:1})).toHaveText('Notificaciones');
  await page.getByRole('button',{name:'Marcar todas como leídas',exact:true}).click();await page.getByRole('button',{name:'Sin leer',exact:true}).click();await expect(page.getByRole('heading',{name:'Estás al día'})).toBeVisible();
});
test('desktop and mobile critical screens meet automated WCAG 2.2 AA checks',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  for(const id of ['inicio','cuenta','pagos','asistencia','credenciales','perfil']){
   await page.goto(`/demo?seccion=${id}`);await expect(page.getByRole('heading',{level:1})).toContainText(sections[id]);
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
   expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),`${id} at ${width}`).toEqual([]);
  }
 }
});
test('capture final desktop, tablet, mobile and login evidence',async({page})=>{
 for(const [name,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]] as const){await page.setViewportSize({width,height});await page.goto('/demo');await expect(page.getByRole('heading',{level:1})).toContainText('Hola, María');await page.screenshot({path:path.resolve(`../../docs/portal/screenshots/${name}.png`),fullPage:true});}
 await page.setViewportSize({width:1440,height:1000});await page.goto('/login');await expect(page.getByRole('button',{name:'Acceso aún no habilitado'})).toBeDisabled();await page.screenshot({path:path.resolve('../../docs/portal/screenshots/login.png'),fullPage:true});
});
test('Flow result previews distinguish payment states and only successful demo offers a marked PDF',async({page,request})=>{
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:950});for(const [state,title] of [['confirmado','Pago confirmado'],['pendiente','Estamos verificando tu pago'],['rechazado','El pago fue rechazado'],['cancelado','El intento de pago fue cancelado']]){await page.goto('/pagos/vista-previa?estado='+state);await expect(page.getByRole('heading',{level:1})).toHaveText(title);await expect(page.getByText('Vista de diseño · Datos de demostración')).toBeVisible();await expect(page.locator('body')).not.toContainText(/flow/i);await expect(page.getByRole('link',{name:'Descargar PDF demo'})).toHaveCount(state==='confirmado'?1:0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);}}
 const pdf=await request.get('/demo/comprobante-flow-demo.pdf');expect(pdf.status()).toBe(200);expect(pdf.headers()['content-type']).toContain('application/pdf');expect((await pdf.body()).subarray(0,4).toString()).toBe('%PDF');
 await page.setViewportSize({width:1440,height:1000});await page.goto('/pagos/vista-previa?estado=confirmado');await expect(page.getByRole('heading',{level:1})).toHaveText('Pago confirmado');await page.screenshot({path:path.resolve('../../docs/portal/screenshots/flow-confirmed.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.resolve('../../docs/portal/screenshots/flow-mobile.png'),fullPage:true});
});
test('monthly and annual projection stops at contract end and demo cancellation does not reach Flow',async({page})=>{
 let mutations=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/'))mutations++;});await page.goto('/demo?seccion=pagos');await page.getByRole('button',{name:'Cancelar suscripción de ejemplo',exact:true}).click();await expect(page.getByRole('region',{name:'¿Quieres revisar la cancelación?'})).toContainText('no cancela una suscripción real');await page.getByRole('button',{name:'Registrar solicitud demo',exact:true}).click();await expect(page.getByRole('button',{name:'Solicitud de ejemplo registrada',exact:true})).toBeDisabled();expect(mutations).toBe(0);
 await page.getByRole('button',{name:'Calendario de pagos',exact:true}).click();await page.getByRole('button',{name:'Año siguiente',exact:true}).click();await expect(page.locator('.projection-month')).toHaveCount(8);await page.getByRole('button',{name:'Mes',exact:true}).click();await page.getByLabel('Mes del calendario').selectOption('9');await expect(page.getByRole('heading',{name:'Sin cobros previstos para este período'})).toBeVisible();await page.getByRole('button',{name:'Año',exact:true}).click();await page.screenshot({path:path.resolve('../../docs/portal/screenshots/flow-calendar.png'),fullPage:true});
});
test('live payment BFF rejects forged origins and fake status claims without connecting a backend',async({request,page})=>{
 const denied=await request.post('/api/flow/start',{headers:{origin:'https://attacker.example'},data:{idempotencyKey:'forged-key-123456'}});expect(denied.status()).toBe(403);const missing=await request.get('/api/flow/status');expect(missing.status()).toBe(401);const fake=await request.post('/api/flow/return',{headers:{'content-type':'application/x-www-form-urlencoded'},data:'token=synthetic_fake_return_token',maxRedirects:0});expect(fake.headers()['set-cookie']??'').toContain('Max-Age=0');await page.goto('/payments?status=CONFIRMED&amount=1');await expect(page.getByRole('heading',{level:1})).toHaveText('Tu pago necesita un acceso válido.');await expect(page.getByRole('link',{name:'Descargar PDF'})).toHaveCount(0);
});
