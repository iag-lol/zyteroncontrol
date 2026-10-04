begin;

alter table public.document_templates add column if not exists legal_status text not null default 'LEGAL_REVIEW_REQUIRED';
alter table public.document_templates drop constraint if exists document_templates_legal_status_check;
alter table public.document_templates add constraint document_templates_legal_status_check check(legal_status in('LEGAL_REVIEW_REQUIRED','LEGAL_APPROVED','RETIRED'));

alter table public.client_contracts add column if not exists project_id uuid;
alter table public.client_contracts add column if not exists quote_id uuid;
alter table public.client_contracts add column if not exists quote_version_id uuid;
alter table public.client_contracts add column if not exists independent_reason text;
alter table public.client_contracts add column if not exists template_codes text[] not null default '{}';
alter table public.client_contracts add column if not exists builder_values jsonb not null default '{}';
alter table public.client_contracts add column if not exists source_snapshot jsonb not null default '{}';
alter table public.client_contracts add column if not exists legal_review_status text not null default 'REQUIRED';
alter table public.client_contracts add column if not exists approval_status text not null default 'DRAFT';
alter table public.client_contracts add column if not exists approved_by uuid;
alter table public.client_contracts add column if not exists approved_at timestamptz;
alter table public.client_contracts add column if not exists effective_status text not null default 'NOT_STARTED';
alter table public.client_contracts add column if not exists compliance_status text not null default 'NOT_ASSESSED';
alter table public.client_contracts add column if not exists collection_status text not null default 'NOT_DUE';
alter table public.client_contracts add column if not exists frozen_at timestamptz;
alter table public.client_contracts add column if not exists frozen_hash text;
alter table public.client_contracts add column if not exists original_document_id uuid;
alter table public.client_contracts add column if not exists signed_document_id uuid;
alter table public.client_contracts add column if not exists signed_document_hash text;
alter table public.client_contracts add column if not exists signature_evidence jsonb not null default '{}';

do $$begin
  if to_regclass('public.projects') is not null and not exists(select 1 from pg_constraint where conname='client_contracts_project_fk') then
    alter table public.client_contracts add constraint client_contracts_project_fk foreign key(project_id) references public.projects(id) on delete restrict not valid;
  end if;
  if to_regclass('public.quotes') is not null and not exists(select 1 from pg_constraint where conname='client_contracts_quote_fk') then
    alter table public.client_contracts add constraint client_contracts_quote_fk foreign key(quote_id) references public.quotes(id) on delete restrict not valid;
  end if;
  if to_regclass('public.quote_versions') is not null and not exists(select 1 from pg_constraint where conname='client_contracts_quote_version_fk') then
    alter table public.client_contracts add constraint client_contracts_quote_version_fk foreign key(quote_version_id) references public.quote_versions(id) on delete restrict not valid;
  end if;
  if to_regclass('public.documents') is not null and not exists(select 1 from pg_constraint where conname='client_contracts_original_document_fk') then
    alter table public.client_contracts add constraint client_contracts_original_document_fk foreign key(original_document_id) references public.documents(id) on delete restrict not valid;
  end if;
  if to_regclass('public.documents') is not null and not exists(select 1 from pg_constraint where conname='client_contracts_signed_document_fk') then
    alter table public.client_contracts add constraint client_contracts_signed_document_fk foreign key(signed_document_id) references public.documents(id) on delete restrict not valid;
  end if;
end$$;

alter table public.client_contracts drop constraint if exists client_contracts_legal_review_status_check;
alter table public.client_contracts add constraint client_contracts_legal_review_status_check check(legal_review_status in('REQUIRED','IN_REVIEW','APPROVED','CHANGES_REQUIRED'));
alter table public.client_contracts drop constraint if exists client_contracts_approval_status_check;
alter table public.client_contracts add constraint client_contracts_approval_status_check check(approval_status in('DRAFT','PENDING','APPROVED','REJECTED'));
alter table public.client_contracts drop constraint if exists client_contracts_effective_status_check;
alter table public.client_contracts add constraint client_contracts_effective_status_check check(effective_status in('NOT_STARTED','EFFECTIVE','SUSPENDED','ENDED'));
alter table public.client_contracts drop constraint if exists client_contracts_compliance_status_check;
alter table public.client_contracts add constraint client_contracts_compliance_status_check check(compliance_status in('NOT_ASSESSED','COMPLIANT','AT_RISK','BREACHED','REMEDIATED'));
alter table public.client_contracts drop constraint if exists client_contracts_collection_status_check;
alter table public.client_contracts add constraint client_contracts_collection_status_check check(collection_status in('NOT_DUE','DUE','PARTIAL','PAID','OVERDUE','DISPUTED'));

create table if not exists public.contract_obligations(
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.client_contracts(id) on delete restrict,
  idempotency_key text not null,
  obligation_type text not null check(obligation_type in('MILESTONE','PAYMENT_DRAFT','RECURRING_SERVICE_DRAFT','DELIVERABLE','NOTICE','DATA_RETURN')),
  title text not null,
  description text,
  amount numeric(16,2) check(amount is null or amount>=0),
  currency char(3),
  due_date date,
  activation_condition text,
  activation_evidence jsonb not null default '{}',
  status text not null default 'DRAFT' check(status in('DRAFT','READY','ACTIVE','FULFILLED','CANCELLED')),
  source_snapshot_hash text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contract_id,idempotency_key)
);

create table if not exists public.contract_authority_reviews(
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.client_contracts(id) on delete restrict,
  party text not null check(party in('ZYTERON','CLIENT')),
  representative_name text not null,
  representative_rut text,
  authority_basis text not null,
  evidence_document_id uuid references public.documents(id) on delete restrict,
  reviewed_by uuid,
  reviewed_at timestamptz,
  status text not null default 'PENDING' check(status in('PENDING','VERIFIED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_copy_receipts(
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.client_contracts(id) on delete restrict,
  recipient_type text not null check(recipient_type in('ZYTERON','CLIENT')),
  recipient_name text not null,
  recipient_email text not null,
  document_id uuid references public.documents(id) on delete restrict,
  delivery_reference text,
  delivered_at timestamptz,
  received_at timestamptz,
  status text not null default 'PENDING' check(status in('PENDING','DELIVERED','RECEIVED','FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_generation_events(
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.client_contracts(id) on delete restrict,
  event_type text not null,
  actor_id uuid,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index if not exists client_contracts_project_idx on public.client_contracts(project_id);
create index if not exists client_contracts_quote_idx on public.client_contracts(quote_id,quote_version_id);
create index if not exists contract_obligations_contract_idx on public.contract_obligations(contract_id,status);
create index if not exists contract_authority_reviews_contract_idx on public.contract_authority_reviews(contract_id,status);

create or replace function public.validate_contract_project_client() returns trigger language plpgsql as $$
declare project_client uuid; quote_client uuid;
begin
  if new.project_id is not null and to_regclass('public.projects') is not null then
    execute 'select client_id from public.projects where id=$1' into project_client using new.project_id;
    if project_client is null then raise exception 'Proyecto no encontrado'; end if;
    if project_client<>new.client_id then raise exception 'El proyecto pertenece a otro cliente'; end if;
  end if;
  if new.quote_id is not null and to_regclass('public.quotes') is not null then
    execute 'select client_id from public.quotes where id=$1' into quote_client using new.quote_id;
    if quote_client is null then raise exception 'Cotización no encontrada'; end if;
    if quote_client<>new.client_id then raise exception 'La cotización pertenece a otro cliente'; end if;
  end if;
  if cardinality(new.template_codes)>0 and new.quote_id is null and nullif(btrim(coalesce(new.independent_reason,'')),'') is null then
    raise exception 'Debe asociar una cotización aceptada o justificar el contrato independiente';
  end if;
  return new;
end$$;
drop trigger if exists client_contracts_validate_sources on public.client_contracts;
create trigger client_contracts_validate_sources before insert or update of client_id,project_id,quote_id,independent_reason on public.client_contracts for each row execute function public.validate_contract_project_client();

create or replace function public.prevent_frozen_contract_mutation() returns trigger language plpgsql as $$
begin
  if old.frozen_at is not null and row(new.client_id,new.project_id,new.quote_id,new.quote_version_id,new.template_codes,new.builder_values,new.source_snapshot,new.subtotal,new.tax,new.total,new.currency)
    is distinct from row(old.client_id,old.project_id,old.quote_id,old.quote_version_id,old.template_codes,old.builder_values,old.source_snapshot,old.subtotal,old.tax,old.total,old.currency) then
    raise exception 'La versión contractual congelada es inmutable; cree una nueva versión u orden de cambio';
  end if;
  return new;
end$$;
drop trigger if exists client_contracts_frozen_immutable on public.client_contracts;
create trigger client_contracts_frozen_immutable before update on public.client_contracts for each row execute function public.prevent_frozen_contract_mutation();

alter table public.contract_obligations enable row level security;
alter table public.contract_authority_reviews enable row level security;
alter table public.contract_copy_receipts enable row level security;
alter table public.contract_generation_events enable row level security;

drop policy if exists contract_obligations_scoped on public.contract_obligations;
create policy contract_obligations_scoped on public.contract_obligations for all to authenticated
using(exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id)))
with check(exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL','FINANZAS','OPERACIONES')));
drop policy if exists contract_authority_reviews_scoped on public.contract_authority_reviews;
create policy contract_authority_reviews_scoped on public.contract_authority_reviews for all to authenticated
using(exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id)))
with check(exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in('GERENTE_GENERAL','COMERCIAL')));
drop policy if exists contract_copy_receipts_scoped on public.contract_copy_receipts;
create policy contract_copy_receipts_scoped on public.contract_copy_receipts for all to authenticated
using(exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id)))
with check(exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in('GERENTE_GENERAL','COMERCIAL')));
drop policy if exists contract_generation_events_scoped on public.contract_generation_events;
create policy contract_generation_events_scoped on public.contract_generation_events for select to authenticated
using(exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id)));

insert into public.app_permissions(code,description) values
('client.contracts.clauses','Modificar cláusulas contractuales'),
('client.contracts.signature.verify','Verificar evidencia de firma'),
('client.contracts.terminate','Terminar contratos'),
('client.contracts.annexes','Gestionar anexos')
on conflict(code) do nothing;

insert into public.role_permissions(role,permission_code)
select role,permission from (values
('GERENTE_GENERAL','client.contracts.clauses'),
('GERENTE_GENERAL','client.contracts.signature.verify'),
('GERENTE_GENERAL','client.contracts.terminate'),
('GERENTE_GENERAL','client.contracts.annexes'),
('COMERCIAL','client.contracts.clauses'),
('COMERCIAL','client.contracts.annexes'),
('FINANZAS','client.contracts.signature.verify')
) as p(role,permission)
on conflict do nothing;

insert into public.document_templates(code,version,name,body_html,description,classification,active,legal_status)
values ('ZT-PROYECTO-CL',1,'Contrato de desarrollo y servicios tecnológicos',$zt$====================================================================

CONTRATO N.º {{contrato.numero}}

PROYECTO {{proyecto.codigo}} — {{proyecto.nombre}}

En {{contrato.lugar}}, a {{contrato.fecha}}, comparecen {{empresa.razon_social}}, RUT {{empresa.rut}}, representada por {{empresa.representante_nombre}}, RUT {{empresa.representante_rut}}, con domicilio en {{empresa.domicilio}}, cuya personería consta en {{empresa.personeria}}, en adelante “ZYTERON”; y {{cliente.razon_social}}, RUT {{cliente.rut}}, representada por {{cliente.representante_nombre}}, RUT {{cliente.representante_rut}}, con domicilio en {{cliente.domicilio}}, cuya personería consta en {{cliente.personeria}}, en adelante el “CLIENTE”.

Ambas, las “Partes”, acuerdan:

PRIMERA. OBJETO Y DOCUMENTOS INTEGRANTES.

ZYTERON realizará los servicios tecnológicos individualizados en el Anexo 1, asociados al proyecto y a la cotización allí identificados. Dicho anexo contendrá las condiciones particulares de ejecución y pago.

Los servicios periódicos, cuando existan, se regirán además por el Anexo 2. El tratamiento de datos por cuenta del CLIENTE se regirá por el Anexo 3 cuando corresponda.

Solo se incorporan documentos y versiones expresamente identificados y aceptados. Una actualización del sitio web, catálogo o sistema interno no modifica este contrato.

Una modificación posterior prevalecerá exclusivamente sobre las materias que cambie expresamente. En lo demás, las condiciones particulares complementan este contrato.

Para datos y confidencialidad se aplicarán las obligaciones específicas de sus anexos, sin disminuir protecciones imperativas.

SEGUNDA. ALCANCE Y EXCLUSIONES.

El precio cubre las funcionalidades, integraciones, entregables y actividades descritos en el Anexo 1.

Las exclusiones deben ser claras y compatibles con el propósito contratado; no se utilizarán para omitir trabajos indispensables para cumplir una funcionalidad expresamente comprometida.

No se incluyen desarrollos nuevos, ampliaciones, integraciones adicionales, migraciones no acordadas ni soporte permanente por el solo hecho de haberse contratado un proyecto. Su ejecución requiere una modificación aprobada.

TERCERA. DIRECCIÓN DEL PROYECTO Y COOPERACIÓN.

Las Partes designarán responsables y canales en el Anexo 1.

ZYTERON organizará a su equipo, conservará trazabilidad de avances relevantes y comunicará impedimentos conocidos.

El CLIENTE entregará oportunamente información, materiales, decisiones y accesos que se hayan identificado como necesarios.

El CLIENTE deberá disponer de derechos o autorizaciones sobre los materiales que aporte. ZYTERON responderá de obtener los derechos necesarios sobre las aportaciones que le corresponda suministrar.

Ninguna parte podrá impartir instrucciones ilícitas ni utilizar accesos fuera de su autorización.

CUARTA. PLAZOS, INICIO Y REPROGRAMACIÓN.

Las fechas de entrega, duración y condiciones de inicio se determinarán para este proyecto en el Anexo 1. No existe un plazo comercial universal aplicable a todos los proyectos.

Cuando el inicio dependa de anticipo, accesos o materiales, estos requisitos deberán estar individualizados y ser verificables. ZYTERON confirmará su cumplimiento y el calendario resultante.

Un retraso del CLIENTE solo justificará ajustar actividades realmente afectadas por esa dependencia.

ZYTERON documentará el impedimento, su efecto y la propuesta de reprogramación. No se habilitan extensiones ilimitadas ni se excusan retrasos propios no relacionados.

Los cambios de compromisos se documentarán mediante el mecanismo acordado.

QUINTA. CAMBIOS DE ALCANCE.

Cada solicitud adicional se evaluará respecto de alcance, precio, plazos, seguridad y recursos.

Ninguna parte queda obligada a ejecutar o pagar el cambio antes de la aceptación por representantes autorizados.

Mientras se resuelve una solicitud, continuarán las actividades originales que puedan ejecutarse sin perjuicio.

Las correcciones necesarias para cumplir lo originalmente contratado no serán cobradas como ampliaciones.

SEXTA. PRECIO, IMPUESTOS Y EXIGIBILIDAD.

El precio, moneda, impuestos, anticipos y calendario de pago serán los del Anexo 1 y de la cotización incorporada.

Los cobros deberán individualizar su origen. No se adicionarán cargos no aceptados.

Los anticipos se imputarán al precio y no constituyen, por su sola denominación, una penalidad no reembolsable.

Si se pactan hitos de cobro, se identificarán las condiciones objetivas que hacen exigible cada uno.

El tratamiento y emisión de documentos tributarios se ajustarán a las reglas aplicables a la operación.

SÉPTIMA. PAGO DE FACTURAS Y MORA.

Los vencimientos contractuales respetarán el régimen legal de pago de facturas.

Cuando resulte aplicable la Ley N.º 19.983, se observarán sus artículos 2, 2 bis y 2 ter y los requisitos de cualquier acuerdo excepcional.

ZYTERON podrá exigir los efectos legales de la mora que correspondan, sin duplicar conceptos ni aplicar tasas o penalidades arbitrarias.

Las diferencias fundadas sobre un cobro se revisarán con sus respaldos; la parte no controvertida conservará su exigibilidad, sin limitar derechos legales de reclamación.

OCTAVA. SUSPENSIÓN POR INCUMPLIMIENTO DE PAGO.

Ante una deuda vencida y exigible, ZYTERON podrá suspender prestaciones futuras del servicio afectado después del aviso y oportunidad de regularización pactados en el Anexo 1 o 2, cuando dicha medida sea jurídicamente procedente, proporcional y técnicamente delimitable.

La comunicación identificará monto, documentos, servicio afectado, fecha prevista y forma de regularizar.

No se suspenderán servicios ajenos e independientemente pagados para presionar el cobro.

La suspensión no permite destruir información, apropiarse de dominios del CLIENTE, introducir mecanismos ocultos de bloqueo ni impedir el ejercicio de derechos sobre sus datos.

La conservación y transición se regirán por las cláusulas correspondientes.

ZYTERON no deberá financiar indefinidamente costos externos que el CLIENTE asumió expresamente, pero deberá informar sus consecuencias y alternativas.

NOVENA. INACTIVIDAD DEL CLIENTE Y CIERRE POR FALTA DE COOPERACIÓN.

Existe inactividad relevante cuando un requerimiento indispensable, comunicado al contacto autorizado y dentro del alcance acordado, permanece sin respuesta durante el plazo particular convenido.

No constituye abandono la mera ausencia de nuevos mensajes mientras ZYTERON pueda continuar trabajando.

ZYTERON documentará el bloqueo y requerirá regularización.

Cumplidos los avisos y períodos del Anexo 1, podrá pausar las actividades afectadas y reasignar recursos razonablemente.

Si persiste un incumplimiento esencial después del requerimiento final, podrá poner término al proyecto afectado conforme a este contrato y a la ley.

El cierre requiere comunicación formal y liquidación documentada.

Serán cobrables el trabajo ejecutado conforme al alcance, los hitos devengados y los compromisos externos autorizados, efectivamente asumidos y no recuperables.

Se descontarán anticipos, costos evitados y sumas recuperadas.

No se exigirá automáticamente todo el saldo por labores no realizadas.

La valorización de trabajo parcial se hará según el criterio pactado en el Anexo 1, con evidencia y sin doble cobro.

Un excedente del anticipo deberá restituirse en el plazo de liquidación acordado, sin perjuicio de plazos legales preferentes.

DÉCIMA. REACTIVACIÓN.

La reactivación de un proyecto suspendido requiere resolver sus impedimentos y acordar un calendario realista según recursos disponibles.

Cualquier trabajo adicional de recuperación, actualización o reinstalación se justificará y cotizará antes de ejecutarse.

No habrá un cargo automático de reactivación no informado, ni se cobrará por corregir un incumplimiento propio de ZYTERON.

UNDÉCIMA. ENTREGAS Y ACEPTACIÓN.

ZYTERON comunicará cada entrega con acceso al resultado y sus criterios de prueba.

El CLIENTE dispondrá del período acordado para aprobar o formular observaciones concretas relativas al alcance.

La recepción de un archivo, el transcurso del tiempo o un estado interno de la plataforma no equivalen por sí solos a aceptación integral.

La falta de cooperación se gestiona mediante la cláusula de inactividad, no mediante una firma o aceptación ficticia.

Las observaciones menores que no impidan el uso previsto podrán incorporarse a una lista de pendientes aceptada por ambas Partes.

La puesta en producción se autorizará expresamente, con identificación de riesgos y pendientes conocidos.

La aceptación no elimina derechos legales ni la corrección de defectos cubiertos.

DUODÉCIMA. GARANTÍA CONTRACTUAL Y SOPORTE.

ZYTERON corregirá los defectos reproducibles imputables a su trabajo que incumplan el alcance, bajo la cobertura y procedimiento establecidos en el Anexo 1, sin reducir garantías legales.

Una modificación de un tercero, un uso incompatible o un cambio externo solo excluirán cobertura en la medida en que hayan causado el problema.

Si la revisión demuestra que la falla está cubierta, no se facturará como soporte adicional.

Las mejoras, evolutivos y atenciones fuera de cobertura requieren autorización de precio.

El mantenimiento posterior y sus cargos no se presumen: deben estar contratados expresamente en el Anexo 2.

DECIMOTERCERA. PROPIEDAD INTELECTUAL Y CÓDIGO.

Las Partes distinguen materiales del CLIENTE, desarrollo específico del proyecto, componentes preexistentes de ZYTERON y componentes de terceros.

El Anexo 1 identificará cada categoría y elegirá expresamente su régimen de titularidad o licencia, como estipulación escrita respecto del software por encargo.

Los materiales del CLIENTE no se transfieren a ZYTERON.

Los componentes propios preexistentes y herramientas generales identificados conservarán su titularidad, sin incluir información confidencial o elementos exclusivos del CLIENTE.

Las licencias de terceros seguirán siendo aplicables y se informarán cuando afecten uso, distribución o mantenimiento.

La entrega de código fuente, documentación y accesos, así como los derechos sobre el desarrollo específico, se regirán por la modalidad seleccionada abajo.

No se presumirá que una firma electrónica ordinaria reemplaza formalidades especiales de transferencia de derechos.

DECIMOCUARTA. DOMINIOS, CUENTAS Y ENTREGA TÉCNICA.

El Anexo 1 o 2 determinará la titularidad de dominios, repositorios y cuentas.

Los dominios adquiridos por cuenta del CLIENTE deberán registrarse a su nombre cuando el servicio lo permita.

En cuentas compartidas de ZYTERON se identificará el procedimiento de exportación o migración sin exponer a otros clientes.

Los entregables finales sujetos a pago se entregarán conforme al hito respectivo.

No se utilizarán datos del CLIENTE ni activos de su titularidad como garantía de deudas ajenas a ellos.

La entrega incluirá los accesos autorizados y documentación expresamente contratada, por medios seguros y sin secretos impresos en el contrato.

DECIMOQUINTA. SUBCONTRATACIÓN Y PROVEEDORES.

ZYTERON podrá utilizar personal y colaboradores calificados sujetos a confidencialidad, conservando responsabilidad por su propia prestación.

Los proveedores de infraestructura y sus condiciones deberán identificarse según el Anexo 2; los subencargos de datos requieren el régimen del Anexo 3.

Una falla externa no exime automáticamente a ZYTERON de sus obligaciones de selección, configuración, administración, comunicación o recuperación que haya asumido.

Tampoco transforma en obligación propia una disponibilidad o funcionalidad que no se haya contratado.

DECIMOSEXTA. SEGURIDAD Y DATOS.

Las Partes limitarán accesos a lo necesario y mantendrán procedimientos seguros para credenciales y documentos.

Las medidas operativas, respaldos y responsabilidades se especificarán en los anexos aplicables.

ZYTERON no garantiza ausencia absoluta de ataques; esta precisión no excluye su deber de implementar y mantener las medidas asumidas ni la responsabilidad que legalmente corresponda.

No podrá vender información del CLIENTE ni utilizarla para finalidades incompatibles con el servicio.

DECIMOSÉPTIMA. CONFIDENCIALIDAD Y REFERENCIAS COMERCIALES.

La información no pública intercambiada será utilizada únicamente para la relación contratada y se protegerá conforme al NDA incorporado o, en su ausencia, bajo obligaciones recíprocas de uso limitado, acceso restringido y no divulgación.

Publicar el nombre, logo, capturas, métricas o caso de éxito del CLIENTE requiere autorización separada y específica.

No se considera incluida por contratar el servicio.

DECIMOCTAVA. INCUMPLIMIENTO Y TÉRMINO ANTICIPADO.

Cualquiera de las Partes podrá requerir subsanar un incumplimiento esencial dentro del plazo del Anexo 1.

Si no se subsana, podrá terminar la prestación afectada conforme a derecho.

Ante hechos ilícitos, amenazas graves o compromisos de seguridad que exijan contención inmediata, podrán adoptarse medidas proporcionales, documentadas y notificadas tan pronto sea seguro hacerlo.

El CLIENTE podrá solicitar término anticipado con el aviso acordado.

La liquidación reconocerá trabajo efectivamente ejecutado, obligaciones devengadas y costos externos autorizados no recuperables, descontando anticipos, recuperaciones y trabajo evitado.

El término por incumplimiento de ZYTERON no elimina restituciones o indemnizaciones procedentes.

DECIMONOVENA. SALIDA, TRANSICIÓN Y CONSERVACIÓN.

Al término se confeccionará una liquidación y un inventario de datos, accesos y entregables.

ZYTERON entregará los activos del CLIENTE y las versiones pagadas que correspondan, y facilitará la devolución o exportación de datos bajo el formato, seguridad y período pactados.

La migración especializada adicional se cotizará cuando no esté incluida.

No se cobrará extra por deberes legales o restituciones causadas por incumplimiento propio.

Los documentos sujetos a conservación legal permanecerán restringidos; los demás datos se devolverán o eliminarán conforme al Anexo 3.

No habrá borrado automático por una mera factura vencida.

VIGÉSIMA. RESPONSABILIDAD Y EVENTOS EXTERNOS.

Cada Parte responderá por los incumplimientos que le sean imputables conforme al contrato y la ley.

No se garantizan ventas, posicionamiento en buscadores, aprobación de plataformas externas ni otros resultados no incluidos expresamente.

Solo cuando sea legalmente admisible y exista negociación expresa documentada en el Anexo 1 regirá el límite de responsabilidad allí descrito.

No cubrirá dolo, culpa grave ni responsabilidades irrenunciables, ni afectará derechos de titulares de datos o potestades de autoridades.

Si no existe un límite válido y expresamente pactado, se aplicará el régimen legal.

La Parte que invoque fuerza mayor deberá acreditar el impedimento, comunicarlo y mitigar sus efectos.

Un ataque informático o falla de proveedor no constituye por sí solo una exoneración.

Si el impedimento se prolonga, las Partes evaluarán reprogramación o término con liquidación de prestaciones.

VIGESIMOPRIMERA. COMUNICACIONES Y MODIFICACIONES.

Las comunicaciones contractuales se dirigirán a los canales del Anexo 1.

Las Partes actualizarán sus contactos.

Se conservará evidencia de envío y recepción disponible; un rebote no se tratará como recepción acreditada.

Una orden de cambio requerirá aceptación de quienes tengan facultades.

Cambios de precio, derechos, renovación o datos no se incorporarán unilateralmente mediante una configuración de la plataforma.

VIGESIMOSEGUNDA. FIRMA, COPIAS Y LEY APLICABLE.

El contrato y anexos podrán suscribirse mediante firma electrónica conforme a la Ley N.º 19.799, utilizando el mecanismo individualizado en las condiciones particulares y las formalidades adicionales que correspondan.

Cada Parte recibirá la versión íntegra suscrita.

Rige la ley chilena.

Las Partes procurarán una solución directa sin impedir medidas urgentes ni el ejercicio oportuno de acciones.

Serán competentes los tribunales que correspondan conforme a la ley.

Solo si es válido y expresamente acordado se aplicará el domicilio convencional indicado en el Anexo 1.

No se renuncian derechos imperativos de consumidores o micro y pequeñas empresas protegidas.

Una condición inválida no autoriza a reemplazarla unilateralmente por otra más gravosa; el resto subsistirá cuando sea jurídicamente posible.

FIRMAS

Por ZYTERON:
{{empresa.representante_nombre}}
{{empresa.representante_rut}}
{{empresa.representante_cargo}}

Por el CLIENTE:
{{cliente.representante_nombre}}
{{cliente.representante_rut}}
{{cliente.representante_cargo}}

Mecanismo y evidencias:
{{firma.modalidad_y_referencia}}$zt$,'Plantilla contractual chilena editable. Requiere revisión legal profesional antes de publicarse.','CONFIDENTIAL',true,'LEGAL_REVIEW_REQUIRED')
on conflict(code,version) do update set name=excluded.name,body_html=excluded.body_html,description=excluded.description,classification=excluded.classification,legal_status=excluded.legal_status,updated_at=now();

insert into public.document_template_versions(template_id,version,body_html,variables,change_summary,status)
select id,1,$zt$====================================================================

CONTRATO N.º {{contrato.numero}}

PROYECTO {{proyecto.codigo}} — {{proyecto.nombre}}

En {{contrato.lugar}}, a {{contrato.fecha}}, comparecen {{empresa.razon_social}}, RUT {{empresa.rut}}, representada por {{empresa.representante_nombre}}, RUT {{empresa.representante_rut}}, con domicilio en {{empresa.domicilio}}, cuya personería consta en {{empresa.personeria}}, en adelante “ZYTERON”; y {{cliente.razon_social}}, RUT {{cliente.rut}}, representada por {{cliente.representante_nombre}}, RUT {{cliente.representante_rut}}, con domicilio en {{cliente.domicilio}}, cuya personería consta en {{cliente.personeria}}, en adelante el “CLIENTE”.

Ambas, las “Partes”, acuerdan:

PRIMERA. OBJETO Y DOCUMENTOS INTEGRANTES.

ZYTERON realizará los servicios tecnológicos individualizados en el Anexo 1, asociados al proyecto y a la cotización allí identificados. Dicho anexo contendrá las condiciones particulares de ejecución y pago.

Los servicios periódicos, cuando existan, se regirán además por el Anexo 2. El tratamiento de datos por cuenta del CLIENTE se regirá por el Anexo 3 cuando corresponda.

Solo se incorporan documentos y versiones expresamente identificados y aceptados. Una actualización del sitio web, catálogo o sistema interno no modifica este contrato.

Una modificación posterior prevalecerá exclusivamente sobre las materias que cambie expresamente. En lo demás, las condiciones particulares complementan este contrato.

Para datos y confidencialidad se aplicarán las obligaciones específicas de sus anexos, sin disminuir protecciones imperativas.

SEGUNDA. ALCANCE Y EXCLUSIONES.

El precio cubre las funcionalidades, integraciones, entregables y actividades descritos en el Anexo 1.

Las exclusiones deben ser claras y compatibles con el propósito contratado; no se utilizarán para omitir trabajos indispensables para cumplir una funcionalidad expresamente comprometida.

No se incluyen desarrollos nuevos, ampliaciones, integraciones adicionales, migraciones no acordadas ni soporte permanente por el solo hecho de haberse contratado un proyecto. Su ejecución requiere una modificación aprobada.

TERCERA. DIRECCIÓN DEL PROYECTO Y COOPERACIÓN.

Las Partes designarán responsables y canales en el Anexo 1.

ZYTERON organizará a su equipo, conservará trazabilidad de avances relevantes y comunicará impedimentos conocidos.

El CLIENTE entregará oportunamente información, materiales, decisiones y accesos que se hayan identificado como necesarios.

El CLIENTE deberá disponer de derechos o autorizaciones sobre los materiales que aporte. ZYTERON responderá de obtener los derechos necesarios sobre las aportaciones que le corresponda suministrar.

Ninguna parte podrá impartir instrucciones ilícitas ni utilizar accesos fuera de su autorización.

CUARTA. PLAZOS, INICIO Y REPROGRAMACIÓN.

Las fechas de entrega, duración y condiciones de inicio se determinarán para este proyecto en el Anexo 1. No existe un plazo comercial universal aplicable a todos los proyectos.

Cuando el inicio dependa de anticipo, accesos o materiales, estos requisitos deberán estar individualizados y ser verificables. ZYTERON confirmará su cumplimiento y el calendario resultante.

Un retraso del CLIENTE solo justificará ajustar actividades realmente afectadas por esa dependencia.

ZYTERON documentará el impedimento, su efecto y la propuesta de reprogramación. No se habilitan extensiones ilimitadas ni se excusan retrasos propios no relacionados.

Los cambios de compromisos se documentarán mediante el mecanismo acordado.

QUINTA. CAMBIOS DE ALCANCE.

Cada solicitud adicional se evaluará respecto de alcance, precio, plazos, seguridad y recursos.

Ninguna parte queda obligada a ejecutar o pagar el cambio antes de la aceptación por representantes autorizados.

Mientras se resuelve una solicitud, continuarán las actividades originales que puedan ejecutarse sin perjuicio.

Las correcciones necesarias para cumplir lo originalmente contratado no serán cobradas como ampliaciones.

SEXTA. PRECIO, IMPUESTOS Y EXIGIBILIDAD.

El precio, moneda, impuestos, anticipos y calendario de pago serán los del Anexo 1 y de la cotización incorporada.

Los cobros deberán individualizar su origen. No se adicionarán cargos no aceptados.

Los anticipos se imputarán al precio y no constituyen, por su sola denominación, una penalidad no reembolsable.

Si se pactan hitos de cobro, se identificarán las condiciones objetivas que hacen exigible cada uno.

El tratamiento y emisión de documentos tributarios se ajustarán a las reglas aplicables a la operación.

SÉPTIMA. PAGO DE FACTURAS Y MORA.

Los vencimientos contractuales respetarán el régimen legal de pago de facturas.

Cuando resulte aplicable la Ley N.º 19.983, se observarán sus artículos 2, 2 bis y 2 ter y los requisitos de cualquier acuerdo excepcional.

ZYTERON podrá exigir los efectos legales de la mora que correspondan, sin duplicar conceptos ni aplicar tasas o penalidades arbitrarias.

Las diferencias fundadas sobre un cobro se revisarán con sus respaldos; la parte no controvertida conservará su exigibilidad, sin limitar derechos legales de reclamación.

OCTAVA. SUSPENSIÓN POR INCUMPLIMIENTO DE PAGO.

Ante una deuda vencida y exigible, ZYTERON podrá suspender prestaciones futuras del servicio afectado después del aviso y oportunidad de regularización pactados en el Anexo 1 o 2, cuando dicha medida sea jurídicamente procedente, proporcional y técnicamente delimitable.

La comunicación identificará monto, documentos, servicio afectado, fecha prevista y forma de regularizar.

No se suspenderán servicios ajenos e independientemente pagados para presionar el cobro.

La suspensión no permite destruir información, apropiarse de dominios del CLIENTE, introducir mecanismos ocultos de bloqueo ni impedir el ejercicio de derechos sobre sus datos.

La conservación y transición se regirán por las cláusulas correspondientes.

ZYTERON no deberá financiar indefinidamente costos externos que el CLIENTE asumió expresamente, pero deberá informar sus consecuencias y alternativas.

NOVENA. INACTIVIDAD DEL CLIENTE Y CIERRE POR FALTA DE COOPERACIÓN.

Existe inactividad relevante cuando un requerimiento indispensable, comunicado al contacto autorizado y dentro del alcance acordado, permanece sin respuesta durante el plazo particular convenido.

No constituye abandono la mera ausencia de nuevos mensajes mientras ZYTERON pueda continuar trabajando.

ZYTERON documentará el bloqueo y requerirá regularización.

Cumplidos los avisos y períodos del Anexo 1, podrá pausar las actividades afectadas y reasignar recursos razonablemente.

Si persiste un incumplimiento esencial después del requerimiento final, podrá poner término al proyecto afectado conforme a este contrato y a la ley.

El cierre requiere comunicación formal y liquidación documentada.

Serán cobrables el trabajo ejecutado conforme al alcance, los hitos devengados y los compromisos externos autorizados, efectivamente asumidos y no recuperables.

Se descontarán anticipos, costos evitados y sumas recuperadas.

No se exigirá automáticamente todo el saldo por labores no realizadas.

La valorización de trabajo parcial se hará según el criterio pactado en el Anexo 1, con evidencia y sin doble cobro.

Un excedente del anticipo deberá restituirse en el plazo de liquidación acordado, sin perjuicio de plazos legales preferentes.

DÉCIMA. REACTIVACIÓN.

La reactivación de un proyecto suspendido requiere resolver sus impedimentos y acordar un calendario realista según recursos disponibles.

Cualquier trabajo adicional de recuperación, actualización o reinstalación se justificará y cotizará antes de ejecutarse.

No habrá un cargo automático de reactivación no informado, ni se cobrará por corregir un incumplimiento propio de ZYTERON.

UNDÉCIMA. ENTREGAS Y ACEPTACIÓN.

ZYTERON comunicará cada entrega con acceso al resultado y sus criterios de prueba.

El CLIENTE dispondrá del período acordado para aprobar o formular observaciones concretas relativas al alcance.

La recepción de un archivo, el transcurso del tiempo o un estado interno de la plataforma no equivalen por sí solos a aceptación integral.

La falta de cooperación se gestiona mediante la cláusula de inactividad, no mediante una firma o aceptación ficticia.

Las observaciones menores que no impidan el uso previsto podrán incorporarse a una lista de pendientes aceptada por ambas Partes.

La puesta en producción se autorizará expresamente, con identificación de riesgos y pendientes conocidos.

La aceptación no elimina derechos legales ni la corrección de defectos cubiertos.

DUODÉCIMA. GARANTÍA CONTRACTUAL Y SOPORTE.

ZYTERON corregirá los defectos reproducibles imputables a su trabajo que incumplan el alcance, bajo la cobertura y procedimiento establecidos en el Anexo 1, sin reducir garantías legales.

Una modificación de un tercero, un uso incompatible o un cambio externo solo excluirán cobertura en la medida en que hayan causado el problema.

Si la revisión demuestra que la falla está cubierta, no se facturará como soporte adicional.

Las mejoras, evolutivos y atenciones fuera de cobertura requieren autorización de precio.

El mantenimiento posterior y sus cargos no se presumen: deben estar contratados expresamente en el Anexo 2.

DECIMOTERCERA. PROPIEDAD INTELECTUAL Y CÓDIGO.

Las Partes distinguen materiales del CLIENTE, desarrollo específico del proyecto, componentes preexistentes de ZYTERON y componentes de terceros.

El Anexo 1 identificará cada categoría y elegirá expresamente su régimen de titularidad o licencia, como estipulación escrita respecto del software por encargo.

Los materiales del CLIENTE no se transfieren a ZYTERON.

Los componentes propios preexistentes y herramientas generales identificados conservarán su titularidad, sin incluir información confidencial o elementos exclusivos del CLIENTE.

Las licencias de terceros seguirán siendo aplicables y se informarán cuando afecten uso, distribución o mantenimiento.

La entrega de código fuente, documentación y accesos, así como los derechos sobre el desarrollo específico, se regirán por la modalidad seleccionada abajo.

No se presumirá que una firma electrónica ordinaria reemplaza formalidades especiales de transferencia de derechos.

DECIMOCUARTA. DOMINIOS, CUENTAS Y ENTREGA TÉCNICA.

El Anexo 1 o 2 determinará la titularidad de dominios, repositorios y cuentas.

Los dominios adquiridos por cuenta del CLIENTE deberán registrarse a su nombre cuando el servicio lo permita.

En cuentas compartidas de ZYTERON se identificará el procedimiento de exportación o migración sin exponer a otros clientes.

Los entregables finales sujetos a pago se entregarán conforme al hito respectivo.

No se utilizarán datos del CLIENTE ni activos de su titularidad como garantía de deudas ajenas a ellos.

La entrega incluirá los accesos autorizados y documentación expresamente contratada, por medios seguros y sin secretos impresos en el contrato.

DECIMOQUINTA. SUBCONTRATACIÓN Y PROVEEDORES.

ZYTERON podrá utilizar personal y colaboradores calificados sujetos a confidencialidad, conservando responsabilidad por su propia prestación.

Los proveedores de infraestructura y sus condiciones deberán identificarse según el Anexo 2; los subencargos de datos requieren el régimen del Anexo 3.

Una falla externa no exime automáticamente a ZYTERON de sus obligaciones de selección, configuración, administración, comunicación o recuperación que haya asumido.

Tampoco transforma en obligación propia una disponibilidad o funcionalidad que no se haya contratado.

DECIMOSEXTA. SEGURIDAD Y DATOS.

Las Partes limitarán accesos a lo necesario y mantendrán procedimientos seguros para credenciales y documentos.

Las medidas operativas, respaldos y responsabilidades se especificarán en los anexos aplicables.

ZYTERON no garantiza ausencia absoluta de ataques; esta precisión no excluye su deber de implementar y mantener las medidas asumidas ni la responsabilidad que legalmente corresponda.

No podrá vender información del CLIENTE ni utilizarla para finalidades incompatibles con el servicio.

DECIMOSÉPTIMA. CONFIDENCIALIDAD Y REFERENCIAS COMERCIALES.

La información no pública intercambiada será utilizada únicamente para la relación contratada y se protegerá conforme al NDA incorporado o, en su ausencia, bajo obligaciones recíprocas de uso limitado, acceso restringido y no divulgación.

Publicar el nombre, logo, capturas, métricas o caso de éxito del CLIENTE requiere autorización separada y específica.

No se considera incluida por contratar el servicio.

DECIMOCTAVA. INCUMPLIMIENTO Y TÉRMINO ANTICIPADO.

Cualquiera de las Partes podrá requerir subsanar un incumplimiento esencial dentro del plazo del Anexo 1.

Si no se subsana, podrá terminar la prestación afectada conforme a derecho.

Ante hechos ilícitos, amenazas graves o compromisos de seguridad que exijan contención inmediata, podrán adoptarse medidas proporcionales, documentadas y notificadas tan pronto sea seguro hacerlo.

El CLIENTE podrá solicitar término anticipado con el aviso acordado.

La liquidación reconocerá trabajo efectivamente ejecutado, obligaciones devengadas y costos externos autorizados no recuperables, descontando anticipos, recuperaciones y trabajo evitado.

El término por incumplimiento de ZYTERON no elimina restituciones o indemnizaciones procedentes.

DECIMONOVENA. SALIDA, TRANSICIÓN Y CONSERVACIÓN.

Al término se confeccionará una liquidación y un inventario de datos, accesos y entregables.

ZYTERON entregará los activos del CLIENTE y las versiones pagadas que correspondan, y facilitará la devolución o exportación de datos bajo el formato, seguridad y período pactados.

La migración especializada adicional se cotizará cuando no esté incluida.

No se cobrará extra por deberes legales o restituciones causadas por incumplimiento propio.

Los documentos sujetos a conservación legal permanecerán restringidos; los demás datos se devolverán o eliminarán conforme al Anexo 3.

No habrá borrado automático por una mera factura vencida.

VIGÉSIMA. RESPONSABILIDAD Y EVENTOS EXTERNOS.

Cada Parte responderá por los incumplimientos que le sean imputables conforme al contrato y la ley.

No se garantizan ventas, posicionamiento en buscadores, aprobación de plataformas externas ni otros resultados no incluidos expresamente.

Solo cuando sea legalmente admisible y exista negociación expresa documentada en el Anexo 1 regirá el límite de responsabilidad allí descrito.

No cubrirá dolo, culpa grave ni responsabilidades irrenunciables, ni afectará derechos de titulares de datos o potestades de autoridades.

Si no existe un límite válido y expresamente pactado, se aplicará el régimen legal.

La Parte que invoque fuerza mayor deberá acreditar el impedimento, comunicarlo y mitigar sus efectos.

Un ataque informático o falla de proveedor no constituye por sí solo una exoneración.

Si el impedimento se prolonga, las Partes evaluarán reprogramación o término con liquidación de prestaciones.

VIGESIMOPRIMERA. COMUNICACIONES Y MODIFICACIONES.

Las comunicaciones contractuales se dirigirán a los canales del Anexo 1.

Las Partes actualizarán sus contactos.

Se conservará evidencia de envío y recepción disponible; un rebote no se tratará como recepción acreditada.

Una orden de cambio requerirá aceptación de quienes tengan facultades.

Cambios de precio, derechos, renovación o datos no se incorporarán unilateralmente mediante una configuración de la plataforma.

VIGESIMOSEGUNDA. FIRMA, COPIAS Y LEY APLICABLE.

El contrato y anexos podrán suscribirse mediante firma electrónica conforme a la Ley N.º 19.799, utilizando el mecanismo individualizado en las condiciones particulares y las formalidades adicionales que correspondan.

Cada Parte recibirá la versión íntegra suscrita.

Rige la ley chilena.

Las Partes procurarán una solución directa sin impedir medidas urgentes ni el ejercicio oportuno de acciones.

Serán competentes los tribunales que correspondan conforme a la ley.

Solo si es válido y expresamente acordado se aplicará el domicilio convencional indicado en el Anexo 1.

No se renuncian derechos imperativos de consumidores o micro y pequeñas empresas protegidas.

Una condición inválida no autoriza a reemplazarla unilateralmente por otra más gravosa; el resto subsistirá cuando sea jurídicamente posible.

FIRMAS

Por ZYTERON:
{{empresa.representante_nombre}}
{{empresa.representante_rut}}
{{empresa.representante_cargo}}

Por el CLIENTE:
{{cliente.representante_nombre}}
{{cliente.representante_rut}}
{{cliente.representante_cargo}}

Mecanismo y evidencias:
{{firma.modalidad_y_referencia}}$zt$,$json$[{"key":"cliente.domicilio","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.personeria","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.razon_social","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.representante_cargo","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.representante_nombre","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.representante_rut","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.rut","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.fecha","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.lugar","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.numero","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.domicilio","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.personeria","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.razon_social","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.representante_cargo","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.representante_nombre","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.representante_rut","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.rut","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"firma.modalidad_y_referencia","required":true,"visibility":"CLIENT","origin":"firma","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.codigo","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.nombre","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]}]$json$::jsonb,'Carga inicial del texto provisto; pendiente de revisión legal.','DRAFT'
from public.document_templates where code='ZT-PROYECTO-CL' and version=1
on conflict(template_id,version) do update set body_html=excluded.body_html,variables=excluded.variables,change_summary=excluded.change_summary,status='DRAFT',updated_at=now();

insert into public.document_templates(code,version,name,body_html,description,classification,active,legal_status)
values ('ZT-CONDICIONES-CL',1,'Anexo 1 — Condiciones particulares',$zt$====================================================================

ANEXO 1 DEL CONTRATO {{contrato.numero}}

Las Partes individualizadas en el contrato acuerdan las siguientes condiciones para {{proyecto.codigo}} — {{proyecto.nombre}}.

Este documento fija los compromisos particulares; las fechas y montos no se obtendrán después de una fuente mutable.

1. DOCUMENTOS DE ORIGEN.

Cliente:
{{cliente.razon_social}} — {{cliente.rut}}.

Cotización aceptada:
{{cotizacion.numero}}, versión {{cotizacion.version}}, fecha {{cotizacion.fecha_aceptacion}}.

OT vinculada:
{{ot.identificacion_o_no_aplica}}.

Estado inicial y trabajo previo reconocido:
{{proyecto.situacion_inicial}}.

2. OBJETO, ALCANCE Y RESULTADOS.

Objetivo:
{{proyecto.objetivo}}.

Alcance incluido:
{{proyecto.alcance}}.

Exclusiones:
{{proyecto.exclusiones}}.

Entregables y pruebas de aceptación:
{{tabla.entregables}}.

Integraciones, ambientes y restricciones conocidas:
{{proyecto.integraciones_y_requisitos}}.

3. CALENDARIO PARTICULAR.

Condición o fecha de inicio:
{{calendario.inicio}}.

Hitos, dependencias y fechas/reglas determinables:
{{tabla.hitos}}.

Responsabilidades del CLIENTE y fechas requeridas:
{{tabla.aportes_cliente}}.

Período de revisión:
{{calendario.revision}}.

Procedimiento y calendario de correcciones:
{{calendario.correcciones}}.

Puesta en producción:
{{calendario.condicion_produccion}}.

Garantía contractual, inicio y cobertura:
{{garantia.condiciones}}.

4. PRECIO Y PAGOS.

Moneda:
{{precio.moneda}}.

Neto:
{{precio.neto}}.

Impuestos aplicables:
{{precio.impuestos}}.

Total:
{{precio.total}}.

Anticipos, hitos, montos y vencimientos:
{{tabla.pagos}}.

Conversión UF/divisas, fuente y fecha aplicable:
{{precio.conversion_o_no_aplica}}.

Medios y datos de pago verificados:
{{pagos.medios}}.

Correo de recepción tributaria:
{{cliente.email_dte}}.

5. INACTIVIDAD, REGULARIZACIÓN Y LIQUIDACIÓN.

Plazo de respuesta a requerimiento indispensable:
{{inactividad.respuesta}}.

Aviso y condición de suspensión:
{{inactividad.aviso_suspension}}.

Requerimiento final y período de subsanación:
{{inactividad.subsanacion}}.

Criterio verificable de valorización parcial:
{{inactividad.valoracion_parcial}}.

Reglas de reprogramación:
{{inactividad.reprogramacion}}.

Plazo de liquidación y devolución de excedentes:
{{salida.liquidacion}}.

Aviso de término anticipado:
{{salida.preaviso}}.

Formatos, período y labores incluidas de transición:
{{salida.transicion}}.

6. PROPIEDAD INTELECTUAL.

INSTRUCCIÓN DEL GENERADOR:
Seleccionar UNA modalidad y retirar las demás del PDF.

MODALIDAD A — LICENCIA PERPETUA DE DESARROLLO IDENTIFICADO.

Las Partes pactan expresamente que ZYTERON conserva los derechos patrimoniales del desarrollo descrito en {{pi.inventario}}.

Pagado su precio, concede al CLIENTE licencia no exclusiva, de alcance mundial y por toda la duración de esos derechos, para operar el resultado, realizar las copias necesarias de uso y respaldo y encargar mantenimiento a terceros sujetos a confidencialidad.

Su remuneración se incluye en el precio del proyecto.

Las instalaciones, usuarios y facultades de adaptación se detallan en {{pi.alcance_licencia}}.

No incluye comercializar separadamente componentes propios de ZYTERON.

Código fuente y documentación incluidos:
{{pi.entrega_codigo}}.

La terminación del soporte no extingue esta licencia ya pagada.

MODALIDAD B — TRANSFERENCIA DE DERECHOS PATRIMONIALES DEL DESARROLLO ESPECÍFICO.

Las Partes acuerdan expresamente que los derechos sobre los componentes individualizados en {{pi.inventario}} permanecerán en ZYTERON hasta el pago del precio asignado a ellos.

Cumplida esa condición, formalizarán su transferencia bajo el alcance {{pi.derechos_transferidos}}, incluida la entrega de código y documentación {{pi.entrega_codigo}}, con las solemnidades e inscripciones aplicables.

Los responsables, gastos, plazo y gestión de formalización se detallan en {{pi.formalizacion}}.

La plataforma no declarará cumplida una cesión solemne solo por tener un PDF firmado electrónicamente.

Mientras se completa una formalización pendiente por causa de ZYTERON, el CLIENTE que haya pagado podrá operar el desarrollo según el uso contratado.

Se respetan los derechos morales irrenunciables.

MODALIDAD C — SUSCRIPCIÓN A PLATAFORMA.

El CLIENTE contrata acceso a la plataforma identificada en {{pi.plataforma}}, no la adquisición de su código ni una cesión de derechos.

Podrá utilizarla durante la vigencia y conforme a usuarios, capacidades y finalidades de {{pi.alcance_suscripcion}}, bajo la remuneración del Anexo 2.

La salida incluirá la exportación de sus datos conforme al régimen acordado; no una copia de la plataforma completa.

REGLA APLICABLE A TODAS LAS MODALIDADES.

Los componentes preexistentes y licencias de terceros se identifican en:

{{pi.componentes_y_licencias}}.

Para componentes propios incorporados indispensables para utilizar un entregable pagado, se concede una licencia suficiente para ese uso, sin cobro recurrente oculto.

Los componentes bajo suscripción deben identificarse como tales antes de firmar.

7. ACTIVOS, SOPORTE Y SEGURIDAD.

Titularidad de dominios, repositorios y cuentas:
{{tabla.activos}}.

Servicios posteriores:
{{recurrentes.resumen_o_no_contratados}}.

Medidas de seguridad, respaldos y responsables:
{{seguridad.compromisos}}.

Datos personales:
{{datos.encargo_aplica_y_anexo}}.

NDA incorporado:
{{nda.identificacion_o_no_aplica}}.

8. CONDICIONES FINALES.

Límite de responsabilidad:
{{responsabilidad.pacto_expreso_o_regimen_legal}}.

Responsables y facultades:
{{tabla.responsables}}.

Canales de avisos:
{{tabla.notificaciones}}.

Mecanismo de firma:
{{firma.modalidad}}.

Domicilio convencional:
{{contrato.domicilio_convencional_o_regimen_legal}}.

Las Partes aceptan estas condiciones y sus tablas integrantes.

Firmas:
{{bloque.firmas_partes}}.$zt$,'Plantilla contractual chilena editable. Requiere revisión legal profesional antes de publicarse.','CONFIDENTIAL',true,'LEGAL_REVIEW_REQUIRED')
on conflict(code,version) do update set name=excluded.name,body_html=excluded.body_html,description=excluded.description,classification=excluded.classification,legal_status=excluded.legal_status,updated_at=now();

insert into public.document_template_versions(template_id,version,body_html,variables,change_summary,status)
select id,1,$zt$====================================================================

ANEXO 1 DEL CONTRATO {{contrato.numero}}

Las Partes individualizadas en el contrato acuerdan las siguientes condiciones para {{proyecto.codigo}} — {{proyecto.nombre}}.

Este documento fija los compromisos particulares; las fechas y montos no se obtendrán después de una fuente mutable.

1. DOCUMENTOS DE ORIGEN.

Cliente:
{{cliente.razon_social}} — {{cliente.rut}}.

Cotización aceptada:
{{cotizacion.numero}}, versión {{cotizacion.version}}, fecha {{cotizacion.fecha_aceptacion}}.

OT vinculada:
{{ot.identificacion_o_no_aplica}}.

Estado inicial y trabajo previo reconocido:
{{proyecto.situacion_inicial}}.

2. OBJETO, ALCANCE Y RESULTADOS.

Objetivo:
{{proyecto.objetivo}}.

Alcance incluido:
{{proyecto.alcance}}.

Exclusiones:
{{proyecto.exclusiones}}.

Entregables y pruebas de aceptación:
{{tabla.entregables}}.

Integraciones, ambientes y restricciones conocidas:
{{proyecto.integraciones_y_requisitos}}.

3. CALENDARIO PARTICULAR.

Condición o fecha de inicio:
{{calendario.inicio}}.

Hitos, dependencias y fechas/reglas determinables:
{{tabla.hitos}}.

Responsabilidades del CLIENTE y fechas requeridas:
{{tabla.aportes_cliente}}.

Período de revisión:
{{calendario.revision}}.

Procedimiento y calendario de correcciones:
{{calendario.correcciones}}.

Puesta en producción:
{{calendario.condicion_produccion}}.

Garantía contractual, inicio y cobertura:
{{garantia.condiciones}}.

4. PRECIO Y PAGOS.

Moneda:
{{precio.moneda}}.

Neto:
{{precio.neto}}.

Impuestos aplicables:
{{precio.impuestos}}.

Total:
{{precio.total}}.

Anticipos, hitos, montos y vencimientos:
{{tabla.pagos}}.

Conversión UF/divisas, fuente y fecha aplicable:
{{precio.conversion_o_no_aplica}}.

Medios y datos de pago verificados:
{{pagos.medios}}.

Correo de recepción tributaria:
{{cliente.email_dte}}.

5. INACTIVIDAD, REGULARIZACIÓN Y LIQUIDACIÓN.

Plazo de respuesta a requerimiento indispensable:
{{inactividad.respuesta}}.

Aviso y condición de suspensión:
{{inactividad.aviso_suspension}}.

Requerimiento final y período de subsanación:
{{inactividad.subsanacion}}.

Criterio verificable de valorización parcial:
{{inactividad.valoracion_parcial}}.

Reglas de reprogramación:
{{inactividad.reprogramacion}}.

Plazo de liquidación y devolución de excedentes:
{{salida.liquidacion}}.

Aviso de término anticipado:
{{salida.preaviso}}.

Formatos, período y labores incluidas de transición:
{{salida.transicion}}.

6. PROPIEDAD INTELECTUAL.

INSTRUCCIÓN DEL GENERADOR:
Seleccionar UNA modalidad y retirar las demás del PDF.

MODALIDAD A — LICENCIA PERPETUA DE DESARROLLO IDENTIFICADO.

Las Partes pactan expresamente que ZYTERON conserva los derechos patrimoniales del desarrollo descrito en {{pi.inventario}}.

Pagado su precio, concede al CLIENTE licencia no exclusiva, de alcance mundial y por toda la duración de esos derechos, para operar el resultado, realizar las copias necesarias de uso y respaldo y encargar mantenimiento a terceros sujetos a confidencialidad.

Su remuneración se incluye en el precio del proyecto.

Las instalaciones, usuarios y facultades de adaptación se detallan en {{pi.alcance_licencia}}.

No incluye comercializar separadamente componentes propios de ZYTERON.

Código fuente y documentación incluidos:
{{pi.entrega_codigo}}.

La terminación del soporte no extingue esta licencia ya pagada.

MODALIDAD B — TRANSFERENCIA DE DERECHOS PATRIMONIALES DEL DESARROLLO ESPECÍFICO.

Las Partes acuerdan expresamente que los derechos sobre los componentes individualizados en {{pi.inventario}} permanecerán en ZYTERON hasta el pago del precio asignado a ellos.

Cumplida esa condición, formalizarán su transferencia bajo el alcance {{pi.derechos_transferidos}}, incluida la entrega de código y documentación {{pi.entrega_codigo}}, con las solemnidades e inscripciones aplicables.

Los responsables, gastos, plazo y gestión de formalización se detallan en {{pi.formalizacion}}.

La plataforma no declarará cumplida una cesión solemne solo por tener un PDF firmado electrónicamente.

Mientras se completa una formalización pendiente por causa de ZYTERON, el CLIENTE que haya pagado podrá operar el desarrollo según el uso contratado.

Se respetan los derechos morales irrenunciables.

MODALIDAD C — SUSCRIPCIÓN A PLATAFORMA.

El CLIENTE contrata acceso a la plataforma identificada en {{pi.plataforma}}, no la adquisición de su código ni una cesión de derechos.

Podrá utilizarla durante la vigencia y conforme a usuarios, capacidades y finalidades de {{pi.alcance_suscripcion}}, bajo la remuneración del Anexo 2.

La salida incluirá la exportación de sus datos conforme al régimen acordado; no una copia de la plataforma completa.

REGLA APLICABLE A TODAS LAS MODALIDADES.

Los componentes preexistentes y licencias de terceros se identifican en:

{{pi.componentes_y_licencias}}.

Para componentes propios incorporados indispensables para utilizar un entregable pagado, se concede una licencia suficiente para ese uso, sin cobro recurrente oculto.

Los componentes bajo suscripción deben identificarse como tales antes de firmar.

7. ACTIVOS, SOPORTE Y SEGURIDAD.

Titularidad de dominios, repositorios y cuentas:
{{tabla.activos}}.

Servicios posteriores:
{{recurrentes.resumen_o_no_contratados}}.

Medidas de seguridad, respaldos y responsables:
{{seguridad.compromisos}}.

Datos personales:
{{datos.encargo_aplica_y_anexo}}.

NDA incorporado:
{{nda.identificacion_o_no_aplica}}.

8. CONDICIONES FINALES.

Límite de responsabilidad:
{{responsabilidad.pacto_expreso_o_regimen_legal}}.

Responsables y facultades:
{{tabla.responsables}}.

Canales de avisos:
{{tabla.notificaciones}}.

Mecanismo de firma:
{{firma.modalidad}}.

Domicilio convencional:
{{contrato.domicilio_convencional_o_regimen_legal}}.

Las Partes aceptan estas condiciones y sus tablas integrantes.

Firmas:
{{bloque.firmas_partes}}.$zt$,$json$[{"key":"bloque.firmas_partes","required":true,"visibility":"CLIENT","origin":"bloque","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"calendario.condicion_produccion","required":true,"visibility":"CLIENT","origin":"calendario","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"calendario.correcciones","required":true,"visibility":"CLIENT","origin":"calendario","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"calendario.inicio","required":true,"visibility":"CLIENT","origin":"calendario","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"calendario.revision","required":true,"visibility":"CLIENT","origin":"calendario","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.email_dte","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.razon_social","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.rut","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.domicilio_convencional_o_regimen_legal","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.numero","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cotizacion.fecha_aceptacion","required":true,"visibility":"CLIENT","origin":"cotizacion","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cotizacion.numero","required":true,"visibility":"CLIENT","origin":"cotizacion","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cotizacion.version","required":true,"visibility":"CLIENT","origin":"cotizacion","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.encargo_aplica_y_anexo","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"firma.modalidad","required":true,"visibility":"CLIENT","origin":"firma","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"garantia.condiciones","required":true,"visibility":"CLIENT","origin":"garantia","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"inactividad.aviso_suspension","required":true,"visibility":"CLIENT","origin":"inactividad","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"inactividad.reprogramacion","required":true,"visibility":"CLIENT","origin":"inactividad","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"inactividad.respuesta","required":true,"visibility":"CLIENT","origin":"inactividad","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"inactividad.subsanacion","required":true,"visibility":"CLIENT","origin":"inactividad","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"inactividad.valoracion_parcial","required":true,"visibility":"CLIENT","origin":"inactividad","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.identificacion_o_no_aplica","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"ot.identificacion_o_no_aplica","required":true,"visibility":"CLIENT","origin":"ot","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pagos.medios","required":true,"visibility":"CLIENT","origin":"pagos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.alcance_licencia","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.alcance_suscripcion","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.componentes_y_licencias","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.derechos_transferidos","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.entrega_codigo","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.formalizacion","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.inventario","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"pi.plataforma","required":true,"visibility":"CLIENT","origin":"pi","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"precio.conversion_o_no_aplica","required":true,"visibility":"CLIENT","origin":"precio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"precio.impuestos","required":true,"visibility":"CLIENT","origin":"precio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"precio.moneda","required":true,"visibility":"CLIENT","origin":"precio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"precio.neto","required":true,"visibility":"CLIENT","origin":"precio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"precio.total","required":true,"visibility":"CLIENT","origin":"precio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.alcance","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.codigo","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.exclusiones","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.integraciones_y_requisitos","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.nombre","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.objetivo","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.situacion_inicial","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.resumen_o_no_contratados","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"responsabilidad.pacto_expreso_o_regimen_legal","required":true,"visibility":"CLIENT","origin":"responsabilidad","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"salida.liquidacion","required":true,"visibility":"CLIENT","origin":"salida","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"salida.preaviso","required":true,"visibility":"CLIENT","origin":"salida","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"salida.transicion","required":true,"visibility":"CLIENT","origin":"salida","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"seguridad.compromisos","required":true,"visibility":"CLIENT","origin":"seguridad","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.activos","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.aportes_cliente","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.entregables","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.hitos","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.notificaciones","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.pagos","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.responsables","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]}]$json$::jsonb,'Carga inicial del texto provisto; pendiente de revisión legal.','DRAFT'
from public.document_templates where code='ZT-CONDICIONES-CL' and version=1
on conflict(template_id,version) do update set body_html=excluded.body_html,variables=excluded.variables,change_summary=excluded.change_summary,status='DRAFT',updated_at=now();

insert into public.document_templates(code,version,name,body_html,description,classification,active,legal_status)
values ('ZT-NDA-CL',1,'Acuerdo bilateral de confidencialidad',$zt$====================================================================

ACUERDO N.º {{nda.numero}}

Entre {{empresa.identificacion_completa}}, representada por {{empresa.representacion_completa}}, y {{cliente.identificacion_completa}}, representada por {{cliente.representacion_completa}}, en {{nda.lugar}}, a {{nda.fecha}}, se acuerda:

PRIMERA. FINALIDAD.

El intercambio de información se autoriza únicamente para evaluar, negociar, ejecutar o mantener:

{{nda.finalidad_y_proyecto}}.

Este acuerdo no obliga a adjudicar un proyecto ni crea exclusividad comercial.

SEGUNDA. INFORMACIÓN PROTEGIDA.

Comprende información no pública técnica, comercial, financiera y operacional, código, arquitectura, propuestas, bases de datos, credenciales, documentación y datos personales.

Se protege cuando esté identificada como confidencial o su naturaleza y contexto hagan razonable reconocerla como tal.

Cada Parte puede ser divulgadora o receptora.

TERCERA. USO Y CUIDADO.

La receptora la utilizará solo para la finalidad autorizada, limitará accesos y aplicará protección adecuada a su sensibilidad.

No la divulgará, comercializará, publicará ni usará para entrenamiento de modelos de IA o fines propios ajenos al encargo.

La confidencialidad no implica una prohibición general de competencia lícita.

CUARTA. PERSONAS AUTORIZADAS.

Solo accederán trabajadores, asesores y colaboradores que necesiten conocerla y estén sujetos a obligaciones equivalentes.

La receptora responderá de la gestión de esos accesos conforme a derecho.

Para subencargos de datos personales se aplicará además el anexo específico.

QUINTA. EXCLUSIONES.

No se protege bajo este acuerdo información cuya publicidad legítima, conocimiento previo lícito, desarrollo independiente u obtención lícita sin deber de reserva pueda acreditarse.

La divulgación de parte de la información no vuelve público el conjunto confidencial.

SEXTA. REVELACIÓN EXIGIDA.

Si una autoridad competente exige información, se comunicará la exigencia a la divulgadora cuando esté permitido, se entregará solo lo necesario y se procurarán medidas de reserva.

Este acuerdo no impide denuncias lícitas, colaboración con autoridades ni ejercicio de derechos.

SÉPTIMA. INCIDENTES.

La receptora informará sin demora indebida de accesos o divulgaciones no autorizados conocidos que afecten la información recibida, adoptará contención y colaborará razonablemente.

El canal y condiciones operativas serán:

{{nda.canal_incidentes_y_condiciones}}.

Lo anterior no posterga obligaciones legales.

OCTAVA. TITULARIDAD.

La información continúa bajo los derechos de su titular.

El intercambio no concede licencias para explotarla fuera de la finalidad ni autoriza utilizar marcas o referencias comerciales.

NOVENA. DEVOLUCIÓN Y CONSERVACIÓN.

Al terminar la finalidad o mediar solicitud procedente, se devolverá o eliminará la información según:

{{nda.procedimiento_salida}}.

Podrán conservarse exclusivamente respaldos sujetos a eliminación programada y antecedentes exigidos por ley o defensa legítima de derechos, con acceso restringido y sin nuevos usos.

DÉCIMA. DURACIÓN.

Rige desde {{nda.inicio}} y comprende las divulgaciones identificadas en {{nda.ambito_temporal}}.

La obligación general subsistirá por {{nda.supervivencia}} después de terminar la relación.

Para secretos empresariales y datos sujetos a reserva legal subsistirá mientras conserven esa protección.

Las credenciales no podrán reutilizarse tras extinguirse su autorización.

UNDÉCIMA. RESPONSABILIDAD.

La Parte afectada podrá solicitar cese, medidas de protección y reparación acreditada conforme a la ley.

No se establece una multa automática ni se presume un daño de monto arbitrario.

DUODÉCIMA. LEY, MODIFICACIONES Y FIRMA.

Se aplica la ley chilena y la competencia legal correspondiente.

Las modificaciones deben ser aceptadas por ambas Partes.

Se admite firma electrónica jurídicamente procedente, con entrega de copia íntegra a cada firmante.

Firmas:
{{bloque.firmas_partes}}.$zt$,'Plantilla contractual chilena editable. Requiere revisión legal profesional antes de publicarse.','CONFIDENTIAL',true,'LEGAL_REVIEW_REQUIRED')
on conflict(code,version) do update set name=excluded.name,body_html=excluded.body_html,description=excluded.description,classification=excluded.classification,legal_status=excluded.legal_status,updated_at=now();

insert into public.document_template_versions(template_id,version,body_html,variables,change_summary,status)
select id,1,$zt$====================================================================

ACUERDO N.º {{nda.numero}}

Entre {{empresa.identificacion_completa}}, representada por {{empresa.representacion_completa}}, y {{cliente.identificacion_completa}}, representada por {{cliente.representacion_completa}}, en {{nda.lugar}}, a {{nda.fecha}}, se acuerda:

PRIMERA. FINALIDAD.

El intercambio de información se autoriza únicamente para evaluar, negociar, ejecutar o mantener:

{{nda.finalidad_y_proyecto}}.

Este acuerdo no obliga a adjudicar un proyecto ni crea exclusividad comercial.

SEGUNDA. INFORMACIÓN PROTEGIDA.

Comprende información no pública técnica, comercial, financiera y operacional, código, arquitectura, propuestas, bases de datos, credenciales, documentación y datos personales.

Se protege cuando esté identificada como confidencial o su naturaleza y contexto hagan razonable reconocerla como tal.

Cada Parte puede ser divulgadora o receptora.

TERCERA. USO Y CUIDADO.

La receptora la utilizará solo para la finalidad autorizada, limitará accesos y aplicará protección adecuada a su sensibilidad.

No la divulgará, comercializará, publicará ni usará para entrenamiento de modelos de IA o fines propios ajenos al encargo.

La confidencialidad no implica una prohibición general de competencia lícita.

CUARTA. PERSONAS AUTORIZADAS.

Solo accederán trabajadores, asesores y colaboradores que necesiten conocerla y estén sujetos a obligaciones equivalentes.

La receptora responderá de la gestión de esos accesos conforme a derecho.

Para subencargos de datos personales se aplicará además el anexo específico.

QUINTA. EXCLUSIONES.

No se protege bajo este acuerdo información cuya publicidad legítima, conocimiento previo lícito, desarrollo independiente u obtención lícita sin deber de reserva pueda acreditarse.

La divulgación de parte de la información no vuelve público el conjunto confidencial.

SEXTA. REVELACIÓN EXIGIDA.

Si una autoridad competente exige información, se comunicará la exigencia a la divulgadora cuando esté permitido, se entregará solo lo necesario y se procurarán medidas de reserva.

Este acuerdo no impide denuncias lícitas, colaboración con autoridades ni ejercicio de derechos.

SÉPTIMA. INCIDENTES.

La receptora informará sin demora indebida de accesos o divulgaciones no autorizados conocidos que afecten la información recibida, adoptará contención y colaborará razonablemente.

El canal y condiciones operativas serán:

{{nda.canal_incidentes_y_condiciones}}.

Lo anterior no posterga obligaciones legales.

OCTAVA. TITULARIDAD.

La información continúa bajo los derechos de su titular.

El intercambio no concede licencias para explotarla fuera de la finalidad ni autoriza utilizar marcas o referencias comerciales.

NOVENA. DEVOLUCIÓN Y CONSERVACIÓN.

Al terminar la finalidad o mediar solicitud procedente, se devolverá o eliminará la información según:

{{nda.procedimiento_salida}}.

Podrán conservarse exclusivamente respaldos sujetos a eliminación programada y antecedentes exigidos por ley o defensa legítima de derechos, con acceso restringido y sin nuevos usos.

DÉCIMA. DURACIÓN.

Rige desde {{nda.inicio}} y comprende las divulgaciones identificadas en {{nda.ambito_temporal}}.

La obligación general subsistirá por {{nda.supervivencia}} después de terminar la relación.

Para secretos empresariales y datos sujetos a reserva legal subsistirá mientras conserven esa protección.

Las credenciales no podrán reutilizarse tras extinguirse su autorización.

UNDÉCIMA. RESPONSABILIDAD.

La Parte afectada podrá solicitar cese, medidas de protección y reparación acreditada conforme a la ley.

No se establece una multa automática ni se presume un daño de monto arbitrario.

DUODÉCIMA. LEY, MODIFICACIONES Y FIRMA.

Se aplica la ley chilena y la competencia legal correspondiente.

Las modificaciones deben ser aceptadas por ambas Partes.

Se admite firma electrónica jurídicamente procedente, con entrega de copia íntegra a cada firmante.

Firmas:
{{bloque.firmas_partes}}.$zt$,$json$[{"key":"bloque.firmas_partes","required":true,"visibility":"CLIENT","origin":"bloque","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.identificacion_completa","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cliente.representacion_completa","required":true,"visibility":"CLIENT","origin":"cliente","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.identificacion_completa","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"empresa.representacion_completa","required":true,"visibility":"CLIENT","origin":"empresa","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.ambito_temporal","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.canal_incidentes_y_condiciones","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.fecha","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.finalidad_y_proyecto","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.inicio","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.lugar","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.numero","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.procedimiento_salida","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"nda.supervivencia","required":true,"visibility":"CLIENT","origin":"nda","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]}]$json$::jsonb,'Carga inicial del texto provisto; pendiente de revisión legal.','DRAFT'
from public.document_templates where code='ZT-NDA-CL' and version=1
on conflict(template_id,version) do update set body_html=excluded.body_html,variables=excluded.variables,change_summary=excluded.change_summary,status='DRAFT',updated_at=now();

insert into public.document_templates(code,version,name,body_html,description,classification,active,legal_status)
values ('ZT-RECURRENTES-CL',1,'Anexo 2 — Servicios recurrentes y proveedores',$zt$====================================================================

ANEXO 2 DEL CONTRATO {{contrato.numero}}

PROYECTO {{proyecto.codigo}}

PRIMERA. SERVICIOS EXPRESAMENTE CONTRATADOS.

Las Partes acuerdan únicamente los servicios de:

{{tabla.servicios_recurrentes}}.

La tabla debe individualizar servicio, proveedor, alcance, cuenta y titular, precio, moneda, impuestos, periodicidad, límites, responsable de pago, fecha o condición de activación, renovación y salida.

No existen servicios periódicos obligatorios omitidos de esa tabla.

SEGUNDA. SEPARACIÓN DE CONCEPTOS.

Cada cobro distinguirá honorario ZYTERON, costo externo, administración o margen expresamente pactado y consumo variable.

Cuando el CLIENTE contrate directamente con el proveedor, ZYTERON no volverá a cobrar ese costo como si lo hubiera pagado.

Si ZYTERON gestiona o contrata el recurso, el mecanismo de cálculo y respaldo será:

{{recurrentes.modalidad_costos}}.

TERCERA. INICIO DE COBROS.

Cada servicio comenzará en la fecha o evento verificable de su fila.

El término del desarrollo no activa por sí solo todos los cargos.

Los recursos necesarios durante desarrollo solo serán cobrables si fueron previamente identificados y aceptados.

El sistema registrará la evidencia de activación y evitará duplicidades.

CUARTA. SERVICIO DE ZYTERON Y NIVELES DE ATENCIÓN.

El alcance periódico será:

{{recurrentes.alcance}}.

Sus exclusiones:

{{recurrentes.exclusiones}}.

La atención se prestará por:

{{recurrentes.canales}}.

En:

{{recurrentes.horarios_y_zona}}.

Los objetivos de respuesta, restauración o resolución serán los de:

{{tabla.sla}}.

Una respuesta inicial no equivale a solución completa.

No se ofrece atención permanente ni disponibilidad absoluta si no está contratada.

QUINTA. RESPALDOS Y RECUPERACIÓN.

Las obligaciones de copia, frecuencia, conservación, alcance, pruebas y recuperación serán:

{{recurrentes.respaldos}}.

Se distinguirán la copia de base de datos, los archivos y la configuración.

No se presentará una copia existente como restauración verificada.

La responsabilidad del CLIENTE sobre sistemas externos se individualizará sin eliminar las obligaciones que ZYTERON asumió.

SEXTA. CONSUMO VARIABLE.

Las unidades, tarifa, fuente de medición, alertas y presupuesto autorizado serán:

{{recurrentes.consumo_y_topes}}.

ZYTERON no contratará ampliaciones ni extras fuera del límite aceptado sin aprobación, salvo medidas urgentes previamente autorizadas y delimitadas.

El CLIENTE podrá consultar el respaldo del consumo facturado.

SÉPTIMA. VARIACIONES DE TARIFA.

Los honorarios propios solo variarán por el mecanismo objetivo expresamente pactado en {{recurrentes.reajuste}} o mediante nuevo acuerdo.

Los cambios de costos de terceros deberán acreditarse y notificarse bajo {{recurrentes.aviso_cambios}}; no autorizan aumentar otros componentes.

Si no existe una fórmula válida previamente aceptada que cubra el cambio, se solicitará aprobación.

El silencio no constituye aceptación de un precio nuevo.

Ante desacuerdo se evaluará mantener el alcance, migrar o terminar el servicio afectado sin penalidad por el mero rechazo, liquidando prestaciones y compromisos previamente autorizados.

Ninguna disposición desplaza las protecciones legales aplicables.

OCTAVA. FACTURACIÓN Y PAGO.

La modalidad anticipada o vencida, períodos, vencimientos y prorrateos serán:

{{recurrentes.facturacion}}.

Los pagos se sujetan a la cláusula legal del contrato.

Una factura vencida no autoriza un cargo bancario sin mandato.

NOVENA. COBRO AUTOMÁTICO OPCIONAL.

El uso de cargo recurrente requiere autorización separada que indique proveedor de pagos, servicios, periodicidad, monto o regla determinable, avisos y revocación.

No se incluyen mandatos ilimitados.

Revocar el cargo automático no extingue por sí solo deudas válidas ni sustituye la solicitud de término del servicio.

ZYTERON no almacenará CVV ni credenciales bancarias del CLIENTE.

DÉCIMA. RENOVACIÓN Y CANCELACIÓN.

El plazo y modalidad serán:

{{recurrentes.vigencia_y_renovacion}}.

La renovación automática solo operará si fue aceptada expresamente.

Se informarán los avisos y canales de término de:

{{recurrentes.cancelacion}}.

Los compromisos anuales o no recuperables se detallarán antes de su contratación; no se crearán retroactivamente.

UNDÉCIMA. INCUMPLIMIENTO Y CONTINUIDAD.

La suspensión se sujetará a avisos, oportunidad de regularización y proporcionalidad establecidos en {{recurrentes.suspension}} y en el contrato.

No se eliminarán datos como método de cobranza.

La restricción de un proveedor externo se informará con alternativas razonables cuando existan; ZYTERON conservará sus obligaciones propias.

DUODÉCIMA. SALIDA Y PORTABILIDAD.

Se aplicará:

{{recurrentes.transicion}}.

Este régimen identificará activos, formatos de exportación, responsables, costos adicionales autorizados y período de entrega.

No se condicionará la devolución legalmente exigible de datos a contratar una renovación.

El término del soporte no extingue licencias perpetuas ya pagadas.

La terminación de una suscripción no transfiere la propiedad de la plataforma del proveedor.

Las Partes aceptan las tablas y condiciones de este anexo.

Firmas:
{{bloque.firmas_partes}}.$zt$,'Plantilla contractual chilena editable. Requiere revisión legal profesional antes de publicarse.','CONFIDENTIAL',true,'LEGAL_REVIEW_REQUIRED')
on conflict(code,version) do update set name=excluded.name,body_html=excluded.body_html,description=excluded.description,classification=excluded.classification,legal_status=excluded.legal_status,updated_at=now();

insert into public.document_template_versions(template_id,version,body_html,variables,change_summary,status)
select id,1,$zt$====================================================================

ANEXO 2 DEL CONTRATO {{contrato.numero}}

PROYECTO {{proyecto.codigo}}

PRIMERA. SERVICIOS EXPRESAMENTE CONTRATADOS.

Las Partes acuerdan únicamente los servicios de:

{{tabla.servicios_recurrentes}}.

La tabla debe individualizar servicio, proveedor, alcance, cuenta y titular, precio, moneda, impuestos, periodicidad, límites, responsable de pago, fecha o condición de activación, renovación y salida.

No existen servicios periódicos obligatorios omitidos de esa tabla.

SEGUNDA. SEPARACIÓN DE CONCEPTOS.

Cada cobro distinguirá honorario ZYTERON, costo externo, administración o margen expresamente pactado y consumo variable.

Cuando el CLIENTE contrate directamente con el proveedor, ZYTERON no volverá a cobrar ese costo como si lo hubiera pagado.

Si ZYTERON gestiona o contrata el recurso, el mecanismo de cálculo y respaldo será:

{{recurrentes.modalidad_costos}}.

TERCERA. INICIO DE COBROS.

Cada servicio comenzará en la fecha o evento verificable de su fila.

El término del desarrollo no activa por sí solo todos los cargos.

Los recursos necesarios durante desarrollo solo serán cobrables si fueron previamente identificados y aceptados.

El sistema registrará la evidencia de activación y evitará duplicidades.

CUARTA. SERVICIO DE ZYTERON Y NIVELES DE ATENCIÓN.

El alcance periódico será:

{{recurrentes.alcance}}.

Sus exclusiones:

{{recurrentes.exclusiones}}.

La atención se prestará por:

{{recurrentes.canales}}.

En:

{{recurrentes.horarios_y_zona}}.

Los objetivos de respuesta, restauración o resolución serán los de:

{{tabla.sla}}.

Una respuesta inicial no equivale a solución completa.

No se ofrece atención permanente ni disponibilidad absoluta si no está contratada.

QUINTA. RESPALDOS Y RECUPERACIÓN.

Las obligaciones de copia, frecuencia, conservación, alcance, pruebas y recuperación serán:

{{recurrentes.respaldos}}.

Se distinguirán la copia de base de datos, los archivos y la configuración.

No se presentará una copia existente como restauración verificada.

La responsabilidad del CLIENTE sobre sistemas externos se individualizará sin eliminar las obligaciones que ZYTERON asumió.

SEXTA. CONSUMO VARIABLE.

Las unidades, tarifa, fuente de medición, alertas y presupuesto autorizado serán:

{{recurrentes.consumo_y_topes}}.

ZYTERON no contratará ampliaciones ni extras fuera del límite aceptado sin aprobación, salvo medidas urgentes previamente autorizadas y delimitadas.

El CLIENTE podrá consultar el respaldo del consumo facturado.

SÉPTIMA. VARIACIONES DE TARIFA.

Los honorarios propios solo variarán por el mecanismo objetivo expresamente pactado en {{recurrentes.reajuste}} o mediante nuevo acuerdo.

Los cambios de costos de terceros deberán acreditarse y notificarse bajo {{recurrentes.aviso_cambios}}; no autorizan aumentar otros componentes.

Si no existe una fórmula válida previamente aceptada que cubra el cambio, se solicitará aprobación.

El silencio no constituye aceptación de un precio nuevo.

Ante desacuerdo se evaluará mantener el alcance, migrar o terminar el servicio afectado sin penalidad por el mero rechazo, liquidando prestaciones y compromisos previamente autorizados.

Ninguna disposición desplaza las protecciones legales aplicables.

OCTAVA. FACTURACIÓN Y PAGO.

La modalidad anticipada o vencida, períodos, vencimientos y prorrateos serán:

{{recurrentes.facturacion}}.

Los pagos se sujetan a la cláusula legal del contrato.

Una factura vencida no autoriza un cargo bancario sin mandato.

NOVENA. COBRO AUTOMÁTICO OPCIONAL.

El uso de cargo recurrente requiere autorización separada que indique proveedor de pagos, servicios, periodicidad, monto o regla determinable, avisos y revocación.

No se incluyen mandatos ilimitados.

Revocar el cargo automático no extingue por sí solo deudas válidas ni sustituye la solicitud de término del servicio.

ZYTERON no almacenará CVV ni credenciales bancarias del CLIENTE.

DÉCIMA. RENOVACIÓN Y CANCELACIÓN.

El plazo y modalidad serán:

{{recurrentes.vigencia_y_renovacion}}.

La renovación automática solo operará si fue aceptada expresamente.

Se informarán los avisos y canales de término de:

{{recurrentes.cancelacion}}.

Los compromisos anuales o no recuperables se detallarán antes de su contratación; no se crearán retroactivamente.

UNDÉCIMA. INCUMPLIMIENTO Y CONTINUIDAD.

La suspensión se sujetará a avisos, oportunidad de regularización y proporcionalidad establecidos en {{recurrentes.suspension}} y en el contrato.

No se eliminarán datos como método de cobranza.

La restricción de un proveedor externo se informará con alternativas razonables cuando existan; ZYTERON conservará sus obligaciones propias.

DUODÉCIMA. SALIDA Y PORTABILIDAD.

Se aplicará:

{{recurrentes.transicion}}.

Este régimen identificará activos, formatos de exportación, responsables, costos adicionales autorizados y período de entrega.

No se condicionará la devolución legalmente exigible de datos a contratar una renovación.

El término del soporte no extingue licencias perpetuas ya pagadas.

La terminación de una suscripción no transfiere la propiedad de la plataforma del proveedor.

Las Partes aceptan las tablas y condiciones de este anexo.

Firmas:
{{bloque.firmas_partes}}.$zt$,$json$[{"key":"bloque.firmas_partes","required":true,"visibility":"CLIENT","origin":"bloque","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.numero","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.codigo","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.alcance","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.aviso_cambios","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.canales","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.cancelacion","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.consumo_y_topes","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.exclusiones","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.facturacion","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.horarios_y_zona","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.modalidad_costos","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.reajuste","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.respaldos","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.suspension","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.transicion","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"recurrentes.vigencia_y_renovacion","required":true,"visibility":"CLIENT","origin":"recurrentes","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.servicios_recurrentes","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"tabla.sla","required":true,"visibility":"CLIENT","origin":"tabla","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]}]$json$::jsonb,'Carga inicial del texto provisto; pendiente de revisión legal.','DRAFT'
from public.document_templates where code='ZT-RECURRENTES-CL' and version=1
on conflict(template_id,version) do update set body_html=excluded.body_html,variables=excluded.variables,change_summary=excluded.change_summary,status='DRAFT',updated_at=now();

insert into public.document_templates(code,version,name,body_html,description,classification,active,legal_status)
values ('ZT-DATOS-CL',1,'Anexo 3 — Encargo de tratamiento de datos',$zt$====================================================================

ANEXO 3 DEL CONTRATO {{contrato.numero}}

PRIMERA. ROLES Y OBJETO.

Respecto de los tratamientos identificados en {{datos.ficha_encargo}}, el CLIENTE determina la finalidad y encarga a ZYTERON las operaciones necesarias para {{datos.finalidad}}.

Se identifican categorías de datos y titulares, operaciones, duración, sistemas y contactos.

Cada Parte conserva sus responsabilidades sobre tratamientos propios, como facturación o administración de su personal.

SEGUNDA. INSTRUCCIONES Y LEGITIMIDAD.

El CLIENTE entregará instrucciones documentadas y contará con las habilitaciones y avisos exigibles para el tratamiento encomendado.

ZYTERON no utilizará los datos para publicidad propia, venta de bases, entrenamiento de IA ni otros fines ajenos.

Si detecta una instrucción aparentemente ilícita, advertirá y suspenderá esa operación específica hasta aclararla.

TERCERA. PERSONAL Y SEGURIDAD.

ZYTERON aplicará las medidas individualizadas en {{datos.medidas_seguridad}}, con responsabilidades y evidencias verificables.

El acceso se limitará al personal necesario sujeto a reserva.

Las pruebas usarán datos sintéticos o debidamente protegidos.

Los datos sensibles requieren autorización e identificación expresa y medidas acordes al riesgo.

CUARTA. SUBENCARGADOS Y UBICACIONES.

Solo podrán intervenir los subencargados específicamente autorizados por escrito en {{datos.subencargados_autorizados}}, con servicio, datos involucrados y ubicaciones efectivas.

Un nuevo subencargo requerirá autorización específica antes del acceso.

ZYTERON impondrá obligaciones compatibles y conservará las responsabilidades legales correspondientes.

Las transferencias internacionales deberán contar con fundamento y resguardos aplicables; este anexo no presume autorizadas todas las transferencias.

QUINTA. INCIDENTES Y COOPERACIÓN.

ZYTERON notificará al contacto {{datos.contacto_incidentes}} sin demora indebida un incidente que afecte los datos encomendados y aportará progresivamente la información disponible, acciones de contención y medidas de recuperación.

El plazo operativo máximo pactado será {{datos.plazo_notificacion}}, sin ampliar obligaciones legales más exigentes.

Cooperará en solicitudes de titulares y requerimientos de autoridades dentro de sus funciones.

SEXTA. VERIFICACIÓN.

ZYTERON facilitará información razonable sobre el cumplimiento de este encargo.

Las revisiones acordadas se realizarán con confidencialidad, alcance proporcional y sin acceso a información de otros clientes ni afectación innecesaria del servicio.

Una investigación justificada por incidente no se tratará como un acceso ordinario sin prioridad.

SÉPTIMA. TÉRMINO Y CONSERVACIÓN.

Concluido el encargo, los datos se devolverán o suprimirán conforme a {{datos.devolucion_y_retencion}}, incluyendo tratamiento de respaldos y constancia de ejecución.

Los antecedentes cuya conservación sea legalmente necesaria permanecerán bloqueados para otros usos y se eliminarán cuando cese su fundamento.

Ninguna autorización comercial permite conservarlos indefinidamente.

OCTAVA. NORMATIVA Y SUBSISTENCIA.

Este encargo se ejecutará bajo la normativa chilena de datos personales aplicable en cada momento, incluyendo las modificaciones de la Ley N.º 21.719 desde su entrada en vigor.

La reserva y las obligaciones de conservación o eliminación subsistirán mientras proceda.

El anexo no limita derechos de titulares ni atribuciones de autoridades.

Firmas:
{{bloque.firmas_partes}}.$zt$,'Plantilla contractual chilena editable. Requiere revisión legal profesional antes de publicarse.','CONFIDENTIAL',true,'LEGAL_REVIEW_REQUIRED')
on conflict(code,version) do update set name=excluded.name,body_html=excluded.body_html,description=excluded.description,classification=excluded.classification,legal_status=excluded.legal_status,updated_at=now();

insert into public.document_template_versions(template_id,version,body_html,variables,change_summary,status)
select id,1,$zt$====================================================================

ANEXO 3 DEL CONTRATO {{contrato.numero}}

PRIMERA. ROLES Y OBJETO.

Respecto de los tratamientos identificados en {{datos.ficha_encargo}}, el CLIENTE determina la finalidad y encarga a ZYTERON las operaciones necesarias para {{datos.finalidad}}.

Se identifican categorías de datos y titulares, operaciones, duración, sistemas y contactos.

Cada Parte conserva sus responsabilidades sobre tratamientos propios, como facturación o administración de su personal.

SEGUNDA. INSTRUCCIONES Y LEGITIMIDAD.

El CLIENTE entregará instrucciones documentadas y contará con las habilitaciones y avisos exigibles para el tratamiento encomendado.

ZYTERON no utilizará los datos para publicidad propia, venta de bases, entrenamiento de IA ni otros fines ajenos.

Si detecta una instrucción aparentemente ilícita, advertirá y suspenderá esa operación específica hasta aclararla.

TERCERA. PERSONAL Y SEGURIDAD.

ZYTERON aplicará las medidas individualizadas en {{datos.medidas_seguridad}}, con responsabilidades y evidencias verificables.

El acceso se limitará al personal necesario sujeto a reserva.

Las pruebas usarán datos sintéticos o debidamente protegidos.

Los datos sensibles requieren autorización e identificación expresa y medidas acordes al riesgo.

CUARTA. SUBENCARGADOS Y UBICACIONES.

Solo podrán intervenir los subencargados específicamente autorizados por escrito en {{datos.subencargados_autorizados}}, con servicio, datos involucrados y ubicaciones efectivas.

Un nuevo subencargo requerirá autorización específica antes del acceso.

ZYTERON impondrá obligaciones compatibles y conservará las responsabilidades legales correspondientes.

Las transferencias internacionales deberán contar con fundamento y resguardos aplicables; este anexo no presume autorizadas todas las transferencias.

QUINTA. INCIDENTES Y COOPERACIÓN.

ZYTERON notificará al contacto {{datos.contacto_incidentes}} sin demora indebida un incidente que afecte los datos encomendados y aportará progresivamente la información disponible, acciones de contención y medidas de recuperación.

El plazo operativo máximo pactado será {{datos.plazo_notificacion}}, sin ampliar obligaciones legales más exigentes.

Cooperará en solicitudes de titulares y requerimientos de autoridades dentro de sus funciones.

SEXTA. VERIFICACIÓN.

ZYTERON facilitará información razonable sobre el cumplimiento de este encargo.

Las revisiones acordadas se realizarán con confidencialidad, alcance proporcional y sin acceso a información de otros clientes ni afectación innecesaria del servicio.

Una investigación justificada por incidente no se tratará como un acceso ordinario sin prioridad.

SÉPTIMA. TÉRMINO Y CONSERVACIÓN.

Concluido el encargo, los datos se devolverán o suprimirán conforme a {{datos.devolucion_y_retencion}}, incluyendo tratamiento de respaldos y constancia de ejecución.

Los antecedentes cuya conservación sea legalmente necesaria permanecerán bloqueados para otros usos y se eliminarán cuando cese su fundamento.

Ninguna autorización comercial permite conservarlos indefinidamente.

OCTAVA. NORMATIVA Y SUBSISTENCIA.

Este encargo se ejecutará bajo la normativa chilena de datos personales aplicable en cada momento, incluyendo las modificaciones de la Ley N.º 21.719 desde su entrada en vigor.

La reserva y las obligaciones de conservación o eliminación subsistirán mientras proceda.

El anexo no limita derechos de titulares ni atribuciones de autoridades.

Firmas:
{{bloque.firmas_partes}}.$zt$,$json$[{"key":"bloque.firmas_partes","required":true,"visibility":"CLIENT","origin":"bloque","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.numero","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.contacto_incidentes","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.devolucion_y_retencion","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.ficha_encargo","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.finalidad","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.medidas_seguridad","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.plazo_notificacion","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"datos.subencargados_autorizados","required":true,"visibility":"CLIENT","origin":"datos","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]}]$json$::jsonb,'Carga inicial del texto provisto; pendiente de revisión legal.','DRAFT'
from public.document_templates where code='ZT-DATOS-CL' and version=1
on conflict(template_id,version) do update set body_html=excluded.body_html,variables=excluded.variables,change_summary=excluded.change_summary,status='DRAFT',updated_at=now();

insert into public.document_templates(code,version,name,body_html,description,classification,active,legal_status)
values ('ZT-CAMBIO-CL',1,'Orden de cambio y reprogramación',$zt$====================================================================

ORDEN DE CAMBIO N.º {{cambio.numero}}

Contrato {{contrato.numero}} — Proyecto {{proyecto.codigo}}

Las Partes individualizadas en el contrato acuerdan modificar exclusivamente:

Solicitud y motivo:
{{cambio.motivo}}.

Alcance anterior:
{{cambio.alcance_anterior}}.

Alcance resultante y exclusiones:
{{cambio.alcance_nuevo}}.

Entregables y aceptación:
{{cambio.entregables}}.

Efecto en precio, impuestos y pagos:
{{cambio.impacto_economico}}.

Efecto en hitos y calendario:
{{cambio.impacto_plazos}}.

Dependencias y responsables:
{{cambio.dependencias}}.

Efecto en servicios recurrentes:
{{cambio.impacto_recurrentes}}.

Efecto en propiedad intelectual, datos y seguridad:
{{cambio.impacto_legal_tecnico}}.

Fecha o condición de vigencia:
{{cambio.vigencia}}.

Cotización adicional y versión, si existe:
{{cambio.cotizacion_o_no_aplica}}.

Los aspectos sin modificación se identificarán como “sin cambio”, no quedarán vacíos.

El resto del contrato permanece vigente.

Esta orden no reconoce trabajos, cobros o aceptaciones diferentes de los expresamente descritos.

Su ejecución requiere aceptación de representantes con facultades.

Firmas:
{{bloque.firmas_partes}}.$zt$,'Plantilla contractual chilena editable. Requiere revisión legal profesional antes de publicarse.','CONFIDENTIAL',true,'LEGAL_REVIEW_REQUIRED')
on conflict(code,version) do update set name=excluded.name,body_html=excluded.body_html,description=excluded.description,classification=excluded.classification,legal_status=excluded.legal_status,updated_at=now();

insert into public.document_template_versions(template_id,version,body_html,variables,change_summary,status)
select id,1,$zt$====================================================================

ORDEN DE CAMBIO N.º {{cambio.numero}}

Contrato {{contrato.numero}} — Proyecto {{proyecto.codigo}}

Las Partes individualizadas en el contrato acuerdan modificar exclusivamente:

Solicitud y motivo:
{{cambio.motivo}}.

Alcance anterior:
{{cambio.alcance_anterior}}.

Alcance resultante y exclusiones:
{{cambio.alcance_nuevo}}.

Entregables y aceptación:
{{cambio.entregables}}.

Efecto en precio, impuestos y pagos:
{{cambio.impacto_economico}}.

Efecto en hitos y calendario:
{{cambio.impacto_plazos}}.

Dependencias y responsables:
{{cambio.dependencias}}.

Efecto en servicios recurrentes:
{{cambio.impacto_recurrentes}}.

Efecto en propiedad intelectual, datos y seguridad:
{{cambio.impacto_legal_tecnico}}.

Fecha o condición de vigencia:
{{cambio.vigencia}}.

Cotización adicional y versión, si existe:
{{cambio.cotizacion_o_no_aplica}}.

Los aspectos sin modificación se identificarán como “sin cambio”, no quedarán vacíos.

El resto del contrato permanece vigente.

Esta orden no reconoce trabajos, cobros o aceptaciones diferentes de los expresamente descritos.

Su ejecución requiere aceptación de representantes con facultades.

Firmas:
{{bloque.firmas_partes}}.$zt$,$json$[{"key":"bloque.firmas_partes","required":true,"visibility":"CLIENT","origin":"bloque","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.alcance_anterior","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.alcance_nuevo","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.cotizacion_o_no_aplica","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.dependencias","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.entregables","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.impacto_economico","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.impacto_legal_tecnico","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.impacto_plazos","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.impacto_recurrentes","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.motivo","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.numero","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"cambio.vigencia","required":true,"visibility":"CLIENT","origin":"cambio","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"contrato.numero","required":true,"visibility":"CLIENT","origin":"contrato","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]},{"key":"proyecto.codigo","required":true,"visibility":"CLIENT","origin":"proyecto","editableBy":["CREATOR","LEGAL_REVIEWER","APPROVER"]}]$json$::jsonb,'Carga inicial del texto provisto; pendiente de revisión legal.','DRAFT'
from public.document_templates where code='ZT-CAMBIO-CL' and version=1
on conflict(template_id,version) do update set body_html=excluded.body_html,variables=excluded.variables,change_summary=excluded.change_summary,status='DRAFT',updated_at=now();

commit;
