// Public synthetic fixtures. Never import this module from /api/client.
export const DEMO_DATE = '11-10-2026';
export const services = [
  { id: 'web', name: 'Sitio web corporativo', domain: 'altosur.example', icon: 'globe', category: 'Web & hosting', description: 'Hosting administrado, respaldo y soporte de tu sitio.', price: '$89.000', period: 'mensual + IVA', renewal: '01-11-2026', status: 'Activo', scope: ['Hosting administrado', 'Respaldo diario contratado', 'Certificado TLS', 'Soporte según contrato'], color: 'green' },
  { id: 'mail', name: 'Correo empresarial', domain: '12 cuentas · Google Workspace', icon: 'mail', category: 'Productividad', description: 'Herramientas para que tu equipo trabaje conectado.', price: 'USD 84', period: 'mensual + impuestos', renewal: '01-11-2026', status: 'Activo', scope: ['12 licencias Business Starter', 'Administración de cuentas', 'Soporte de configuración'], color: 'blue' },
  { id: 'care', name: 'Mantención & soporte', domain: 'Plan Acompañamiento', icon: 'shield', category: 'Continuidad', description: 'Actualizaciones y asistencia para tu operación digital.', price: '$65.000', period: 'mensual + IVA', renewal: '01-11-2026', status: 'Activo', scope: ['Mantención preventiva mensual', 'Informe de acciones', 'Atención en horario contratado'], color: 'purple' },
  { id: 'domain', name: 'Dominio corporativo', domain: 'altosur.example', icon: 'link', category: 'Activos digitales', description: 'Administración de dominio y configuración de DNS.', price: '$24.990', period: 'anual + IVA', renewal: '15-12-2026', status: 'Activo', scope: ['Titular: Altosur SpA (demo)', 'Administración DNS', 'Renovación anual'], color: 'orange' },
];
export const projects = [
  { id: 'p1', name: 'Una nueva experiencia digital', short: 'Rediseño del sitio web', category: 'DISEÑO & DESARROLLO', description: 'Un sitio que refleja quiénes son y conecta mejor con sus clientes.', progress: 68, phase: 'Diseño de interfaces', date: '16-10-2026', next: 'Revisión de propuesta visual', initials: ['CM', 'AV', 'JP'], color: 'forest', steps: ['Descubrimiento', 'Estructura y contenidos', 'Diseño de interfaces', 'Desarrollo', 'Publicación'], current: 2 },
  { id: 'p2', name: 'Tu operación, más simple', short: 'Portal de proveedores', category: 'SOFTWARE A MEDIDA', description: 'Centralización de solicitudes y documentos de proveedores.', progress: 32, phase: 'Arquitectura & definición', date: '20-10-2026', next: 'Validación de flujos', initials: ['AV', 'FR'], color: 'sand', steps: ['Diagnóstico', 'Arquitectura', 'Diseño', 'Desarrollo', 'Entrega'], current: 1 },
  { id: 'p3', name: 'Conecta cada oportunidad', short: 'Automatización comercial', category: 'INTEGRACIONES', description: 'Conexión entre formularios, CRM y seguimiento comercial.', progress: 100, phase: 'Entregado', date: '08-10-2026', next: 'Entrega publicada de ejemplo', initials: ['JP', 'FR'], color: 'blue', steps: ['Diagnóstico', 'Configuración', 'Validación', 'Entrega'], current: 3 },
];
export const invoices = [
  { id: 'F-1024', concept: 'Sitio web · Hosting y mantención', period: 'Octubre 2026', issued: '01-10-2026', due: '08-10-2026', amount: '$183.260', net: '$154.000', tax: '$29.260', balance: '$183.260', status: 'Vencida', obligation: 'Pendiente', document: 'Emitido (ejemplo)' },
  { id: 'F-1028', concept: 'Rediseño web · Hito de diseño', period: 'Hito 2 de 4', issued: '09-10-2026', due: '20-10-2026', amount: '$357.000', net: '$300.000', tax: '$57.000', balance: '$357.000', status: 'Pendiente', obligation: 'Pendiente', document: 'Emitido (ejemplo)' },
  { id: 'F-0998', concept: 'Sitio web · Hosting y mantención', period: 'Septiembre 2026', issued: '01-09-2026', due: '08-09-2026', amount: '$183.260', net: '$154.000', tax: '$29.260', balance: '$0', status: 'Pagada', obligation: 'Saldada', document: 'Emitido (ejemplo)' },
];
export const documents = [
  { id: 'd1', name: 'Propuesta visual · Sitio corporativo', type: 'Entregable', project: 'Rediseño del sitio web', date: '09-10-2026', version: 'v2.0', status: 'Por revisar', size: 'Ejemplo de ficha' },
  { id: 'd2', name: 'Contrato de servicios digitales', type: 'Contrato', project: 'Servicios recurrentes', date: '01-09-2026', version: 'v1.0', status: 'Compartido', size: 'Ejemplo de ficha' },
  { id: 'd3', name: 'Informe de mantención · Septiembre', type: 'Informe', project: 'Mantención & soporte', date: '30-09-2026', version: 'v1.0', status: 'Publicado', size: 'Ejemplo de ficha' },
  { id: 'd4', name: 'Guía de uso · Automatización CRM', type: 'Manual', project: 'Automatización comercial', date: '08-10-2026', version: 'v1.0', status: 'Publicado', size: 'Ejemplo de ficha' },
];
export const tickets = [
  { id: 'SOL-208', title: 'Actualizar información de contacto del sitio', category: 'Solicitud', service: 'Sitio web corporativo', date: '09-10-2026', status: 'Esperando tu respuesta', messages: [{ actor: 'Tú', text: 'Necesitamos actualizar el correo de contacto en el pie de página.', time: '09-10-2026 · 10:24' }, { actor: 'Camila · Zyteron', text: 'Podemos ayudarte. ¿Cuál es el nuevo correo que deseas publicar?', time: '09-10-2026 · 11:10' }] },
  { id: 'SOL-205', title: 'Configuración de nueva cuenta de correo', category: 'Asistencia', service: 'Correo empresarial', date: '08-10-2026', status: 'En curso', messages: [{ actor: 'Tú', text: 'Necesitamos una nueva cuenta para el equipo comercial.', time: '08-10-2026 · 09:15' }, { actor: 'Camila · Zyteron', text: 'Estamos revisando las licencias disponibles del plan contratado.', time: '08-10-2026 · 10:05' }] },
  { id: 'SOL-196', title: 'Ajuste de formulario de contacto', category: 'Incidencia', service: 'Sitio web corporativo', date: '02-10-2026', status: 'Resuelta', messages: [{ actor: 'Camila · Zyteron', text: 'El ajuste fue publicado y se compartió la evidencia de prueba.', time: '02-10-2026 · 16:30' }] },
];
export const notifications = [
  { id: 'n1', title: 'Tu propuesta visual está lista', text: 'Hay una nueva versión del diseño para que la revises.', time: '09-10-2026 · 15:30', section: 'documentos', icon: 'file', unread: true },
  { id: 'n2', title: 'Camila respondió tu solicitud', text: 'Comparte el correo que necesitas publicar en tu sitio.', time: '09-10-2026 · 11:10', section: 'asistencia', icon: 'message', unread: true },
  { id: 'n3', title: 'Factura de octubre disponible', text: 'Revisa el documento de hosting y mantención.', time: '01-10-2026 · 09:00', section: 'cuenta', icon: 'wallet', unread: true },
  { id: 'n4', title: 'Nuevo informe de mantención', text: 'El informe de septiembre está disponible.', time: '30-09-2026 · 17:00', section: 'informes', icon: 'chart', unread: false },
];
export const events = [
  { day: '14', month: 'OCT', title: 'Reunión de seguimiento', description: 'Rediseño web · Videollamada', date: '14-10-2026', time: '10:00 – 10:30', kind: 'Reunión' },
  { day: '16', month: 'OCT', title: 'Revisión de propuesta visual', description: 'Rediseño del sitio web', date: '16-10-2026', time: 'Por coordinar', kind: 'Hito' },
  { day: '20', month: 'OCT', title: 'Vencimiento de factura F-1028', description: 'Hito de diseño · CLP', date: '20-10-2026', time: 'Fecha civil', kind: 'Vencimiento' },
];
