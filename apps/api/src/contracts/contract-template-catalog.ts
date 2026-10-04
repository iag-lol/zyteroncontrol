export type ContractTemplateCategory = "CONTRACT" | "ANNEX" | "NDA" | "CHANGE_ORDER";

export interface ContractVariableDefinition {
  key: string;
  label: string;
  origin: "COMPANY" | "CLIENT" | "PROJECT" | "QUOTE" | "CONTRACT" | "HUMAN_DECISION" | "SIGNATURE";
  required: boolean;
  visibility: "INTERNAL" | "CLIENT";
  editableBy: Array<"CREATOR" | "LEGAL_REVIEWER" | "APPROVER">;
}

export interface ChileanContractTemplate {
  code: string;
  name: string;
  category: ContractTemplateCategory;
  status: "LEGAL_REVIEW_REQUIRED";
  version: number;
  body: string;
  variables: ContractVariableDefinition[];
}

const originFor=(key:string):ContractVariableDefinition["origin"]=>{
  if(key.startsWith("empresa."))return "COMPANY";
  if(key.startsWith("cliente."))return "CLIENT";
  if(key.startsWith("proyecto.")||key.startsWith("ot."))return "PROJECT";
  if(key.startsWith("cotizacion."))return "QUOTE";
  if(key.startsWith("contrato.")||key.startsWith("cambio."))return "CONTRACT";
  if(key.startsWith("firma.")||key==="bloque.firmas_partes")return "SIGNATURE";
  return "HUMAN_DECISION";
};
const labelFor=(key:string)=>key.replaceAll("."," · ").replaceAll("_"," ");
const definitions=(keys:string[]):ContractVariableDefinition[]=>keys.map(key=>({key,label:labelFor(key),origin:originFor(key),required:true,visibility:"CLIENT",editableBy:["CREATOR","LEGAL_REVIEWER","APPROVER"]}));

const source = [
  {
    "code": "ZT-PROYECTO-CL",
    "name": "Contrato de desarrollo y servicios tecnológicos",
    "category": "CONTRACT",
    "body": "====================================================================\n\nCONTRATO N.º {{contrato.numero}}\n\nPROYECTO {{proyecto.codigo}} — {{proyecto.nombre}}\n\nEn {{contrato.lugar}}, a {{contrato.fecha}}, comparecen {{empresa.razon_social}}, RUT {{empresa.rut}}, representada por {{empresa.representante_nombre}}, RUT {{empresa.representante_rut}}, con domicilio en {{empresa.domicilio}}, cuya personería consta en {{empresa.personeria}}, en adelante “ZYTERON”; y {{cliente.razon_social}}, RUT {{cliente.rut}}, representada por {{cliente.representante_nombre}}, RUT {{cliente.representante_rut}}, con domicilio en {{cliente.domicilio}}, cuya personería consta en {{cliente.personeria}}, en adelante el “CLIENTE”.\n\nAmbas, las “Partes”, acuerdan:\n\nPRIMERA. OBJETO Y DOCUMENTOS INTEGRANTES.\n\nZYTERON realizará los servicios tecnológicos individualizados en el Anexo 1, asociados al proyecto y a la cotización allí identificados. Dicho anexo contendrá las condiciones particulares de ejecución y pago.\n\nLos servicios periódicos, cuando existan, se regirán además por el Anexo 2. El tratamiento de datos por cuenta del CLIENTE se regirá por el Anexo 3 cuando corresponda.\n\nSolo se incorporan documentos y versiones expresamente identificados y aceptados. Una actualización del sitio web, catálogo o sistema interno no modifica este contrato.\n\nUna modificación posterior prevalecerá exclusivamente sobre las materias que cambie expresamente. En lo demás, las condiciones particulares complementan este contrato.\n\nPara datos y confidencialidad se aplicarán las obligaciones específicas de sus anexos, sin disminuir protecciones imperativas.\n\nSEGUNDA. ALCANCE Y EXCLUSIONES.\n\nEl precio cubre las funcionalidades, integraciones, entregables y actividades descritos en el Anexo 1.\n\nLas exclusiones deben ser claras y compatibles con el propósito contratado; no se utilizarán para omitir trabajos indispensables para cumplir una funcionalidad expresamente comprometida.\n\nNo se incluyen desarrollos nuevos, ampliaciones, integraciones adicionales, migraciones no acordadas ni soporte permanente por el solo hecho de haberse contratado un proyecto. Su ejecución requiere una modificación aprobada.\n\nTERCERA. DIRECCIÓN DEL PROYECTO Y COOPERACIÓN.\n\nLas Partes designarán responsables y canales en el Anexo 1.\n\nZYTERON organizará a su equipo, conservará trazabilidad de avances relevantes y comunicará impedimentos conocidos.\n\nEl CLIENTE entregará oportunamente información, materiales, decisiones y accesos que se hayan identificado como necesarios.\n\nEl CLIENTE deberá disponer de derechos o autorizaciones sobre los materiales que aporte. ZYTERON responderá de obtener los derechos necesarios sobre las aportaciones que le corresponda suministrar.\n\nNinguna parte podrá impartir instrucciones ilícitas ni utilizar accesos fuera de su autorización.\n\nCUARTA. PLAZOS, INICIO Y REPROGRAMACIÓN.\n\nLas fechas de entrega, duración y condiciones de inicio se determinarán para este proyecto en el Anexo 1. No existe un plazo comercial universal aplicable a todos los proyectos.\n\nCuando el inicio dependa de anticipo, accesos o materiales, estos requisitos deberán estar individualizados y ser verificables. ZYTERON confirmará su cumplimiento y el calendario resultante.\n\nUn retraso del CLIENTE solo justificará ajustar actividades realmente afectadas por esa dependencia.\n\nZYTERON documentará el impedimento, su efecto y la propuesta de reprogramación. No se habilitan extensiones ilimitadas ni se excusan retrasos propios no relacionados.\n\nLos cambios de compromisos se documentarán mediante el mecanismo acordado.\n\nQUINTA. CAMBIOS DE ALCANCE.\n\nCada solicitud adicional se evaluará respecto de alcance, precio, plazos, seguridad y recursos.\n\nNinguna parte queda obligada a ejecutar o pagar el cambio antes de la aceptación por representantes autorizados.\n\nMientras se resuelve una solicitud, continuarán las actividades originales que puedan ejecutarse sin perjuicio.\n\nLas correcciones necesarias para cumplir lo originalmente contratado no serán cobradas como ampliaciones.\n\nSEXTA. PRECIO, IMPUESTOS Y EXIGIBILIDAD.\n\nEl precio, moneda, impuestos, anticipos y calendario de pago serán los del Anexo 1 y de la cotización incorporada.\n\nLos cobros deberán individualizar su origen. No se adicionarán cargos no aceptados.\n\nLos anticipos se imputarán al precio y no constituyen, por su sola denominación, una penalidad no reembolsable.\n\nSi se pactan hitos de cobro, se identificarán las condiciones objetivas que hacen exigible cada uno.\n\nEl tratamiento y emisión de documentos tributarios se ajustarán a las reglas aplicables a la operación.\n\nSÉPTIMA. PAGO DE FACTURAS Y MORA.\n\nLos vencimientos contractuales respetarán el régimen legal de pago de facturas.\n\nCuando resulte aplicable la Ley N.º 19.983, se observarán sus artículos 2, 2 bis y 2 ter y los requisitos de cualquier acuerdo excepcional.\n\nZYTERON podrá exigir los efectos legales de la mora que correspondan, sin duplicar conceptos ni aplicar tasas o penalidades arbitrarias.\n\nLas diferencias fundadas sobre un cobro se revisarán con sus respaldos; la parte no controvertida conservará su exigibilidad, sin limitar derechos legales de reclamación.\n\nOCTAVA. SUSPENSIÓN POR INCUMPLIMIENTO DE PAGO.\n\nAnte una deuda vencida y exigible, ZYTERON podrá suspender prestaciones futuras del servicio afectado después del aviso y oportunidad de regularización pactados en el Anexo 1 o 2, cuando dicha medida sea jurídicamente procedente, proporcional y técnicamente delimitable.\n\nLa comunicación identificará monto, documentos, servicio afectado, fecha prevista y forma de regularizar.\n\nNo se suspenderán servicios ajenos e independientemente pagados para presionar el cobro.\n\nLa suspensión no permite destruir información, apropiarse de dominios del CLIENTE, introducir mecanismos ocultos de bloqueo ni impedir el ejercicio de derechos sobre sus datos.\n\nLa conservación y transición se regirán por las cláusulas correspondientes.\n\nZYTERON no deberá financiar indefinidamente costos externos que el CLIENTE asumió expresamente, pero deberá informar sus consecuencias y alternativas.\n\nNOVENA. INACTIVIDAD DEL CLIENTE Y CIERRE POR FALTA DE COOPERACIÓN.\n\nExiste inactividad relevante cuando un requerimiento indispensable, comunicado al contacto autorizado y dentro del alcance acordado, permanece sin respuesta durante el plazo particular convenido.\n\nNo constituye abandono la mera ausencia de nuevos mensajes mientras ZYTERON pueda continuar trabajando.\n\nZYTERON documentará el bloqueo y requerirá regularización.\n\nCumplidos los avisos y períodos del Anexo 1, podrá pausar las actividades afectadas y reasignar recursos razonablemente.\n\nSi persiste un incumplimiento esencial después del requerimiento final, podrá poner término al proyecto afectado conforme a este contrato y a la ley.\n\nEl cierre requiere comunicación formal y liquidación documentada.\n\nSerán cobrables el trabajo ejecutado conforme al alcance, los hitos devengados y los compromisos externos autorizados, efectivamente asumidos y no recuperables.\n\nSe descontarán anticipos, costos evitados y sumas recuperadas.\n\nNo se exigirá automáticamente todo el saldo por labores no realizadas.\n\nLa valorización de trabajo parcial se hará según el criterio pactado en el Anexo 1, con evidencia y sin doble cobro.\n\nUn excedente del anticipo deberá restituirse en el plazo de liquidación acordado, sin perjuicio de plazos legales preferentes.\n\nDÉCIMA. REACTIVACIÓN.\n\nLa reactivación de un proyecto suspendido requiere resolver sus impedimentos y acordar un calendario realista según recursos disponibles.\n\nCualquier trabajo adicional de recuperación, actualización o reinstalación se justificará y cotizará antes de ejecutarse.\n\nNo habrá un cargo automático de reactivación no informado, ni se cobrará por corregir un incumplimiento propio de ZYTERON.\n\nUNDÉCIMA. ENTREGAS Y ACEPTACIÓN.\n\nZYTERON comunicará cada entrega con acceso al resultado y sus criterios de prueba.\n\nEl CLIENTE dispondrá del período acordado para aprobar o formular observaciones concretas relativas al alcance.\n\nLa recepción de un archivo, el transcurso del tiempo o un estado interno de la plataforma no equivalen por sí solos a aceptación integral.\n\nLa falta de cooperación se gestiona mediante la cláusula de inactividad, no mediante una firma o aceptación ficticia.\n\nLas observaciones menores que no impidan el uso previsto podrán incorporarse a una lista de pendientes aceptada por ambas Partes.\n\nLa puesta en producción se autorizará expresamente, con identificación de riesgos y pendientes conocidos.\n\nLa aceptación no elimina derechos legales ni la corrección de defectos cubiertos.\n\nDUODÉCIMA. GARANTÍA CONTRACTUAL Y SOPORTE.\n\nZYTERON corregirá los defectos reproducibles imputables a su trabajo que incumplan el alcance, bajo la cobertura y procedimiento establecidos en el Anexo 1, sin reducir garantías legales.\n\nUna modificación de un tercero, un uso incompatible o un cambio externo solo excluirán cobertura en la medida en que hayan causado el problema.\n\nSi la revisión demuestra que la falla está cubierta, no se facturará como soporte adicional.\n\nLas mejoras, evolutivos y atenciones fuera de cobertura requieren autorización de precio.\n\nEl mantenimiento posterior y sus cargos no se presumen: deben estar contratados expresamente en el Anexo 2.\n\nDECIMOTERCERA. PROPIEDAD INTELECTUAL Y CÓDIGO.\n\nLas Partes distinguen materiales del CLIENTE, desarrollo específico del proyecto, componentes preexistentes de ZYTERON y componentes de terceros.\n\nEl Anexo 1 identificará cada categoría y elegirá expresamente su régimen de titularidad o licencia, como estipulación escrita respecto del software por encargo.\n\nLos materiales del CLIENTE no se transfieren a ZYTERON.\n\nLos componentes propios preexistentes y herramientas generales identificados conservarán su titularidad, sin incluir información confidencial o elementos exclusivos del CLIENTE.\n\nLas licencias de terceros seguirán siendo aplicables y se informarán cuando afecten uso, distribución o mantenimiento.\n\nLa entrega de código fuente, documentación y accesos, así como los derechos sobre el desarrollo específico, se regirán por la modalidad seleccionada abajo.\n\nNo se presumirá que una firma electrónica ordinaria reemplaza formalidades especiales de transferencia de derechos.\n\nDECIMOCUARTA. DOMINIOS, CUENTAS Y ENTREGA TÉCNICA.\n\nEl Anexo 1 o 2 determinará la titularidad de dominios, repositorios y cuentas.\n\nLos dominios adquiridos por cuenta del CLIENTE deberán registrarse a su nombre cuando el servicio lo permita.\n\nEn cuentas compartidas de ZYTERON se identificará el procedimiento de exportación o migración sin exponer a otros clientes.\n\nLos entregables finales sujetos a pago se entregarán conforme al hito respectivo.\n\nNo se utilizarán datos del CLIENTE ni activos de su titularidad como garantía de deudas ajenas a ellos.\n\nLa entrega incluirá los accesos autorizados y documentación expresamente contratada, por medios seguros y sin secretos impresos en el contrato.\n\nDECIMOQUINTA. SUBCONTRATACIÓN Y PROVEEDORES.\n\nZYTERON podrá utilizar personal y colaboradores calificados sujetos a confidencialidad, conservando responsabilidad por su propia prestación.\n\nLos proveedores de infraestructura y sus condiciones deberán identificarse según el Anexo 2; los subencargos de datos requieren el régimen del Anexo 3.\n\nUna falla externa no exime automáticamente a ZYTERON de sus obligaciones de selección, configuración, administración, comunicación o recuperación que haya asumido.\n\nTampoco transforma en obligación propia una disponibilidad o funcionalidad que no se haya contratado.\n\nDECIMOSEXTA. SEGURIDAD Y DATOS.\n\nLas Partes limitarán accesos a lo necesario y mantendrán procedimientos seguros para credenciales y documentos.\n\nLas medidas operativas, respaldos y responsabilidades se especificarán en los anexos aplicables.\n\nZYTERON no garantiza ausencia absoluta de ataques; esta precisión no excluye su deber de implementar y mantener las medidas asumidas ni la responsabilidad que legalmente corresponda.\n\nNo podrá vender información del CLIENTE ni utilizarla para finalidades incompatibles con el servicio.\n\nDECIMOSÉPTIMA. CONFIDENCIALIDAD Y REFERENCIAS COMERCIALES.\n\nLa información no pública intercambiada será utilizada únicamente para la relación contratada y se protegerá conforme al NDA incorporado o, en su ausencia, bajo obligaciones recíprocas de uso limitado, acceso restringido y no divulgación.\n\nPublicar el nombre, logo, capturas, métricas o caso de éxito del CLIENTE requiere autorización separada y específica.\n\nNo se considera incluida por contratar el servicio.\n\nDECIMOCTAVA. INCUMPLIMIENTO Y TÉRMINO ANTICIPADO.\n\nCualquiera de las Partes podrá requerir subsanar un incumplimiento esencial dentro del plazo del Anexo 1.\n\nSi no se subsana, podrá terminar la prestación afectada conforme a derecho.\n\nAnte hechos ilícitos, amenazas graves o compromisos de seguridad que exijan contención inmediata, podrán adoptarse medidas proporcionales, documentadas y notificadas tan pronto sea seguro hacerlo.\n\nEl CLIENTE podrá solicitar término anticipado con el aviso acordado.\n\nLa liquidación reconocerá trabajo efectivamente ejecutado, obligaciones devengadas y costos externos autorizados no recuperables, descontando anticipos, recuperaciones y trabajo evitado.\n\nEl término por incumplimiento de ZYTERON no elimina restituciones o indemnizaciones procedentes.\n\nDECIMONOVENA. SALIDA, TRANSICIÓN Y CONSERVACIÓN.\n\nAl término se confeccionará una liquidación y un inventario de datos, accesos y entregables.\n\nZYTERON entregará los activos del CLIENTE y las versiones pagadas que correspondan, y facilitará la devolución o exportación de datos bajo el formato, seguridad y período pactados.\n\nLa migración especializada adicional se cotizará cuando no esté incluida.\n\nNo se cobrará extra por deberes legales o restituciones causadas por incumplimiento propio.\n\nLos documentos sujetos a conservación legal permanecerán restringidos; los demás datos se devolverán o eliminarán conforme al Anexo 3.\n\nNo habrá borrado automático por una mera factura vencida.\n\nVIGÉSIMA. RESPONSABILIDAD Y EVENTOS EXTERNOS.\n\nCada Parte responderá por los incumplimientos que le sean imputables conforme al contrato y la ley.\n\nNo se garantizan ventas, posicionamiento en buscadores, aprobación de plataformas externas ni otros resultados no incluidos expresamente.\n\nSolo cuando sea legalmente admisible y exista negociación expresa documentada en el Anexo 1 regirá el límite de responsabilidad allí descrito.\n\nNo cubrirá dolo, culpa grave ni responsabilidades irrenunciables, ni afectará derechos de titulares de datos o potestades de autoridades.\n\nSi no existe un límite válido y expresamente pactado, se aplicará el régimen legal.\n\nLa Parte que invoque fuerza mayor deberá acreditar el impedimento, comunicarlo y mitigar sus efectos.\n\nUn ataque informático o falla de proveedor no constituye por sí solo una exoneración.\n\nSi el impedimento se prolonga, las Partes evaluarán reprogramación o término con liquidación de prestaciones.\n\nVIGESIMOPRIMERA. COMUNICACIONES Y MODIFICACIONES.\n\nLas comunicaciones contractuales se dirigirán a los canales del Anexo 1.\n\nLas Partes actualizarán sus contactos.\n\nSe conservará evidencia de envío y recepción disponible; un rebote no se tratará como recepción acreditada.\n\nUna orden de cambio requerirá aceptación de quienes tengan facultades.\n\nCambios de precio, derechos, renovación o datos no se incorporarán unilateralmente mediante una configuración de la plataforma.\n\nVIGESIMOSEGUNDA. FIRMA, COPIAS Y LEY APLICABLE.\n\nEl contrato y anexos podrán suscribirse mediante firma electrónica conforme a la Ley N.º 19.799, utilizando el mecanismo individualizado en las condiciones particulares y las formalidades adicionales que correspondan.\n\nCada Parte recibirá la versión íntegra suscrita.\n\nRige la ley chilena.\n\nLas Partes procurarán una solución directa sin impedir medidas urgentes ni el ejercicio oportuno de acciones.\n\nSerán competentes los tribunales que correspondan conforme a la ley.\n\nSolo si es válido y expresamente acordado se aplicará el domicilio convencional indicado en el Anexo 1.\n\nNo se renuncian derechos imperativos de consumidores o micro y pequeñas empresas protegidas.\n\nUna condición inválida no autoriza a reemplazarla unilateralmente por otra más gravosa; el resto subsistirá cuando sea jurídicamente posible.\n\nFIRMAS\n\nPor ZYTERON:\n{{empresa.representante_nombre}}\n{{empresa.representante_rut}}\n{{empresa.representante_cargo}}\n\nPor el CLIENTE:\n{{cliente.representante_nombre}}\n{{cliente.representante_rut}}\n{{cliente.representante_cargo}}\n\nMecanismo y evidencias:\n{{firma.modalidad_y_referencia}}",
    "variables": [
      "cliente.domicilio",
      "cliente.personeria",
      "cliente.razon_social",
      "cliente.representante_cargo",
      "cliente.representante_nombre",
      "cliente.representante_rut",
      "cliente.rut",
      "contrato.fecha",
      "contrato.lugar",
      "contrato.numero",
      "empresa.domicilio",
      "empresa.personeria",
      "empresa.razon_social",
      "empresa.representante_cargo",
      "empresa.representante_nombre",
      "empresa.representante_rut",
      "empresa.rut",
      "firma.modalidad_y_referencia",
      "proyecto.codigo",
      "proyecto.nombre"
    ]
  },
  {
    "code": "ZT-CONDICIONES-CL",
    "name": "Anexo 1 — Condiciones particulares",
    "category": "ANNEX",
    "body": "====================================================================\n\nANEXO 1 DEL CONTRATO {{contrato.numero}}\n\nLas Partes individualizadas en el contrato acuerdan las siguientes condiciones para {{proyecto.codigo}} — {{proyecto.nombre}}.\n\nEste documento fija los compromisos particulares; las fechas y montos no se obtendrán después de una fuente mutable.\n\n1. DOCUMENTOS DE ORIGEN.\n\nCliente:\n{{cliente.razon_social}} — {{cliente.rut}}.\n\nCotización aceptada:\n{{cotizacion.numero}}, versión {{cotizacion.version}}, fecha {{cotizacion.fecha_aceptacion}}.\n\nOT vinculada:\n{{ot.identificacion_o_no_aplica}}.\n\nEstado inicial y trabajo previo reconocido:\n{{proyecto.situacion_inicial}}.\n\n2. OBJETO, ALCANCE Y RESULTADOS.\n\nObjetivo:\n{{proyecto.objetivo}}.\n\nAlcance incluido:\n{{proyecto.alcance}}.\n\nExclusiones:\n{{proyecto.exclusiones}}.\n\nEntregables y pruebas de aceptación:\n{{tabla.entregables}}.\n\nIntegraciones, ambientes y restricciones conocidas:\n{{proyecto.integraciones_y_requisitos}}.\n\n3. CALENDARIO PARTICULAR.\n\nCondición o fecha de inicio:\n{{calendario.inicio}}.\n\nHitos, dependencias y fechas/reglas determinables:\n{{tabla.hitos}}.\n\nResponsabilidades del CLIENTE y fechas requeridas:\n{{tabla.aportes_cliente}}.\n\nPeríodo de revisión:\n{{calendario.revision}}.\n\nProcedimiento y calendario de correcciones:\n{{calendario.correcciones}}.\n\nPuesta en producción:\n{{calendario.condicion_produccion}}.\n\nGarantía contractual, inicio y cobertura:\n{{garantia.condiciones}}.\n\n4. PRECIO Y PAGOS.\n\nMoneda:\n{{precio.moneda}}.\n\nNeto:\n{{precio.neto}}.\n\nImpuestos aplicables:\n{{precio.impuestos}}.\n\nTotal:\n{{precio.total}}.\n\nAnticipos, hitos, montos y vencimientos:\n{{tabla.pagos}}.\n\nConversión UF/divisas, fuente y fecha aplicable:\n{{precio.conversion_o_no_aplica}}.\n\nMedios y datos de pago verificados:\n{{pagos.medios}}.\n\nCorreo de recepción tributaria:\n{{cliente.email_dte}}.\n\n5. INACTIVIDAD, REGULARIZACIÓN Y LIQUIDACIÓN.\n\nPlazo de respuesta a requerimiento indispensable:\n{{inactividad.respuesta}}.\n\nAviso y condición de suspensión:\n{{inactividad.aviso_suspension}}.\n\nRequerimiento final y período de subsanación:\n{{inactividad.subsanacion}}.\n\nCriterio verificable de valorización parcial:\n{{inactividad.valoracion_parcial}}.\n\nReglas de reprogramación:\n{{inactividad.reprogramacion}}.\n\nPlazo de liquidación y devolución de excedentes:\n{{salida.liquidacion}}.\n\nAviso de término anticipado:\n{{salida.preaviso}}.\n\nFormatos, período y labores incluidas de transición:\n{{salida.transicion}}.\n\n6. PROPIEDAD INTELECTUAL.\n\nINSTRUCCIÓN DEL GENERADOR:\nSeleccionar UNA modalidad y retirar las demás del PDF.\n\nMODALIDAD A — LICENCIA PERPETUA DE DESARROLLO IDENTIFICADO.\n\nLas Partes pactan expresamente que ZYTERON conserva los derechos patrimoniales del desarrollo descrito en {{pi.inventario}}.\n\nPagado su precio, concede al CLIENTE licencia no exclusiva, de alcance mundial y por toda la duración de esos derechos, para operar el resultado, realizar las copias necesarias de uso y respaldo y encargar mantenimiento a terceros sujetos a confidencialidad.\n\nSu remuneración se incluye en el precio del proyecto.\n\nLas instalaciones, usuarios y facultades de adaptación se detallan en {{pi.alcance_licencia}}.\n\nNo incluye comercializar separadamente componentes propios de ZYTERON.\n\nCódigo fuente y documentación incluidos:\n{{pi.entrega_codigo}}.\n\nLa terminación del soporte no extingue esta licencia ya pagada.\n\nMODALIDAD B — TRANSFERENCIA DE DERECHOS PATRIMONIALES DEL DESARROLLO ESPECÍFICO.\n\nLas Partes acuerdan expresamente que los derechos sobre los componentes individualizados en {{pi.inventario}} permanecerán en ZYTERON hasta el pago del precio asignado a ellos.\n\nCumplida esa condición, formalizarán su transferencia bajo el alcance {{pi.derechos_transferidos}}, incluida la entrega de código y documentación {{pi.entrega_codigo}}, con las solemnidades e inscripciones aplicables.\n\nLos responsables, gastos, plazo y gestión de formalización se detallan en {{pi.formalizacion}}.\n\nLa plataforma no declarará cumplida una cesión solemne solo por tener un PDF firmado electrónicamente.\n\nMientras se completa una formalización pendiente por causa de ZYTERON, el CLIENTE que haya pagado podrá operar el desarrollo según el uso contratado.\n\nSe respetan los derechos morales irrenunciables.\n\nMODALIDAD C — SUSCRIPCIÓN A PLATAFORMA.\n\nEl CLIENTE contrata acceso a la plataforma identificada en {{pi.plataforma}}, no la adquisición de su código ni una cesión de derechos.\n\nPodrá utilizarla durante la vigencia y conforme a usuarios, capacidades y finalidades de {{pi.alcance_suscripcion}}, bajo la remuneración del Anexo 2.\n\nLa salida incluirá la exportación de sus datos conforme al régimen acordado; no una copia de la plataforma completa.\n\nREGLA APLICABLE A TODAS LAS MODALIDADES.\n\nLos componentes preexistentes y licencias de terceros se identifican en:\n\n{{pi.componentes_y_licencias}}.\n\nPara componentes propios incorporados indispensables para utilizar un entregable pagado, se concede una licencia suficiente para ese uso, sin cobro recurrente oculto.\n\nLos componentes bajo suscripción deben identificarse como tales antes de firmar.\n\n7. ACTIVOS, SOPORTE Y SEGURIDAD.\n\nTitularidad de dominios, repositorios y cuentas:\n{{tabla.activos}}.\n\nServicios posteriores:\n{{recurrentes.resumen_o_no_contratados}}.\n\nMedidas de seguridad, respaldos y responsables:\n{{seguridad.compromisos}}.\n\nDatos personales:\n{{datos.encargo_aplica_y_anexo}}.\n\nNDA incorporado:\n{{nda.identificacion_o_no_aplica}}.\n\n8. CONDICIONES FINALES.\n\nLímite de responsabilidad:\n{{responsabilidad.pacto_expreso_o_regimen_legal}}.\n\nResponsables y facultades:\n{{tabla.responsables}}.\n\nCanales de avisos:\n{{tabla.notificaciones}}.\n\nMecanismo de firma:\n{{firma.modalidad}}.\n\nDomicilio convencional:\n{{contrato.domicilio_convencional_o_regimen_legal}}.\n\nLas Partes aceptan estas condiciones y sus tablas integrantes.\n\nFirmas:\n{{bloque.firmas_partes}}.",
    "variables": [
      "bloque.firmas_partes",
      "calendario.condicion_produccion",
      "calendario.correcciones",
      "calendario.inicio",
      "calendario.revision",
      "cliente.email_dte",
      "cliente.razon_social",
      "cliente.rut",
      "contrato.domicilio_convencional_o_regimen_legal",
      "contrato.numero",
      "cotizacion.fecha_aceptacion",
      "cotizacion.numero",
      "cotizacion.version",
      "datos.encargo_aplica_y_anexo",
      "firma.modalidad",
      "garantia.condiciones",
      "inactividad.aviso_suspension",
      "inactividad.reprogramacion",
      "inactividad.respuesta",
      "inactividad.subsanacion",
      "inactividad.valoracion_parcial",
      "nda.identificacion_o_no_aplica",
      "ot.identificacion_o_no_aplica",
      "pagos.medios",
      "pi.alcance_licencia",
      "pi.alcance_suscripcion",
      "pi.componentes_y_licencias",
      "pi.derechos_transferidos",
      "pi.entrega_codigo",
      "pi.formalizacion",
      "pi.inventario",
      "pi.plataforma",
      "precio.conversion_o_no_aplica",
      "precio.impuestos",
      "precio.moneda",
      "precio.neto",
      "precio.total",
      "proyecto.alcance",
      "proyecto.codigo",
      "proyecto.exclusiones",
      "proyecto.integraciones_y_requisitos",
      "proyecto.nombre",
      "proyecto.objetivo",
      "proyecto.situacion_inicial",
      "recurrentes.resumen_o_no_contratados",
      "responsabilidad.pacto_expreso_o_regimen_legal",
      "salida.liquidacion",
      "salida.preaviso",
      "salida.transicion",
      "seguridad.compromisos",
      "tabla.activos",
      "tabla.aportes_cliente",
      "tabla.entregables",
      "tabla.hitos",
      "tabla.notificaciones",
      "tabla.pagos",
      "tabla.responsables"
    ]
  },
  {
    "code": "ZT-NDA-CL",
    "name": "Acuerdo bilateral de confidencialidad",
    "category": "NDA",
    "body": "====================================================================\n\nACUERDO N.º {{nda.numero}}\n\nEntre {{empresa.identificacion_completa}}, representada por {{empresa.representacion_completa}}, y {{cliente.identificacion_completa}}, representada por {{cliente.representacion_completa}}, en {{nda.lugar}}, a {{nda.fecha}}, se acuerda:\n\nPRIMERA. FINALIDAD.\n\nEl intercambio de información se autoriza únicamente para evaluar, negociar, ejecutar o mantener:\n\n{{nda.finalidad_y_proyecto}}.\n\nEste acuerdo no obliga a adjudicar un proyecto ni crea exclusividad comercial.\n\nSEGUNDA. INFORMACIÓN PROTEGIDA.\n\nComprende información no pública técnica, comercial, financiera y operacional, código, arquitectura, propuestas, bases de datos, credenciales, documentación y datos personales.\n\nSe protege cuando esté identificada como confidencial o su naturaleza y contexto hagan razonable reconocerla como tal.\n\nCada Parte puede ser divulgadora o receptora.\n\nTERCERA. USO Y CUIDADO.\n\nLa receptora la utilizará solo para la finalidad autorizada, limitará accesos y aplicará protección adecuada a su sensibilidad.\n\nNo la divulgará, comercializará, publicará ni usará para entrenamiento de modelos de IA o fines propios ajenos al encargo.\n\nLa confidencialidad no implica una prohibición general de competencia lícita.\n\nCUARTA. PERSONAS AUTORIZADAS.\n\nSolo accederán trabajadores, asesores y colaboradores que necesiten conocerla y estén sujetos a obligaciones equivalentes.\n\nLa receptora responderá de la gestión de esos accesos conforme a derecho.\n\nPara subencargos de datos personales se aplicará además el anexo específico.\n\nQUINTA. EXCLUSIONES.\n\nNo se protege bajo este acuerdo información cuya publicidad legítima, conocimiento previo lícito, desarrollo independiente u obtención lícita sin deber de reserva pueda acreditarse.\n\nLa divulgación de parte de la información no vuelve público el conjunto confidencial.\n\nSEXTA. REVELACIÓN EXIGIDA.\n\nSi una autoridad competente exige información, se comunicará la exigencia a la divulgadora cuando esté permitido, se entregará solo lo necesario y se procurarán medidas de reserva.\n\nEste acuerdo no impide denuncias lícitas, colaboración con autoridades ni ejercicio de derechos.\n\nSÉPTIMA. INCIDENTES.\n\nLa receptora informará sin demora indebida de accesos o divulgaciones no autorizados conocidos que afecten la información recibida, adoptará contención y colaborará razonablemente.\n\nEl canal y condiciones operativas serán:\n\n{{nda.canal_incidentes_y_condiciones}}.\n\nLo anterior no posterga obligaciones legales.\n\nOCTAVA. TITULARIDAD.\n\nLa información continúa bajo los derechos de su titular.\n\nEl intercambio no concede licencias para explotarla fuera de la finalidad ni autoriza utilizar marcas o referencias comerciales.\n\nNOVENA. DEVOLUCIÓN Y CONSERVACIÓN.\n\nAl terminar la finalidad o mediar solicitud procedente, se devolverá o eliminará la información según:\n\n{{nda.procedimiento_salida}}.\n\nPodrán conservarse exclusivamente respaldos sujetos a eliminación programada y antecedentes exigidos por ley o defensa legítima de derechos, con acceso restringido y sin nuevos usos.\n\nDÉCIMA. DURACIÓN.\n\nRige desde {{nda.inicio}} y comprende las divulgaciones identificadas en {{nda.ambito_temporal}}.\n\nLa obligación general subsistirá por {{nda.supervivencia}} después de terminar la relación.\n\nPara secretos empresariales y datos sujetos a reserva legal subsistirá mientras conserven esa protección.\n\nLas credenciales no podrán reutilizarse tras extinguirse su autorización.\n\nUNDÉCIMA. RESPONSABILIDAD.\n\nLa Parte afectada podrá solicitar cese, medidas de protección y reparación acreditada conforme a la ley.\n\nNo se establece una multa automática ni se presume un daño de monto arbitrario.\n\nDUODÉCIMA. LEY, MODIFICACIONES Y FIRMA.\n\nSe aplica la ley chilena y la competencia legal correspondiente.\n\nLas modificaciones deben ser aceptadas por ambas Partes.\n\nSe admite firma electrónica jurídicamente procedente, con entrega de copia íntegra a cada firmante.\n\nFirmas:\n{{bloque.firmas_partes}}.",
    "variables": [
      "bloque.firmas_partes",
      "cliente.identificacion_completa",
      "cliente.representacion_completa",
      "empresa.identificacion_completa",
      "empresa.representacion_completa",
      "nda.ambito_temporal",
      "nda.canal_incidentes_y_condiciones",
      "nda.fecha",
      "nda.finalidad_y_proyecto",
      "nda.inicio",
      "nda.lugar",
      "nda.numero",
      "nda.procedimiento_salida",
      "nda.supervivencia"
    ]
  },
  {
    "code": "ZT-RECURRENTES-CL",
    "name": "Anexo 2 — Servicios recurrentes y proveedores",
    "category": "ANNEX",
    "body": "====================================================================\n\nANEXO 2 DEL CONTRATO {{contrato.numero}}\n\nPROYECTO {{proyecto.codigo}}\n\nPRIMERA. SERVICIOS EXPRESAMENTE CONTRATADOS.\n\nLas Partes acuerdan únicamente los servicios de:\n\n{{tabla.servicios_recurrentes}}.\n\nLa tabla debe individualizar servicio, proveedor, alcance, cuenta y titular, precio, moneda, impuestos, periodicidad, límites, responsable de pago, fecha o condición de activación, renovación y salida.\n\nNo existen servicios periódicos obligatorios omitidos de esa tabla.\n\nSEGUNDA. SEPARACIÓN DE CONCEPTOS.\n\nCada cobro distinguirá honorario ZYTERON, costo externo, administración o margen expresamente pactado y consumo variable.\n\nCuando el CLIENTE contrate directamente con el proveedor, ZYTERON no volverá a cobrar ese costo como si lo hubiera pagado.\n\nSi ZYTERON gestiona o contrata el recurso, el mecanismo de cálculo y respaldo será:\n\n{{recurrentes.modalidad_costos}}.\n\nTERCERA. INICIO DE COBROS.\n\nCada servicio comenzará en la fecha o evento verificable de su fila.\n\nEl término del desarrollo no activa por sí solo todos los cargos.\n\nLos recursos necesarios durante desarrollo solo serán cobrables si fueron previamente identificados y aceptados.\n\nEl sistema registrará la evidencia de activación y evitará duplicidades.\n\nCUARTA. SERVICIO DE ZYTERON Y NIVELES DE ATENCIÓN.\n\nEl alcance periódico será:\n\n{{recurrentes.alcance}}.\n\nSus exclusiones:\n\n{{recurrentes.exclusiones}}.\n\nLa atención se prestará por:\n\n{{recurrentes.canales}}.\n\nEn:\n\n{{recurrentes.horarios_y_zona}}.\n\nLos objetivos de respuesta, restauración o resolución serán los de:\n\n{{tabla.sla}}.\n\nUna respuesta inicial no equivale a solución completa.\n\nNo se ofrece atención permanente ni disponibilidad absoluta si no está contratada.\n\nQUINTA. RESPALDOS Y RECUPERACIÓN.\n\nLas obligaciones de copia, frecuencia, conservación, alcance, pruebas y recuperación serán:\n\n{{recurrentes.respaldos}}.\n\nSe distinguirán la copia de base de datos, los archivos y la configuración.\n\nNo se presentará una copia existente como restauración verificada.\n\nLa responsabilidad del CLIENTE sobre sistemas externos se individualizará sin eliminar las obligaciones que ZYTERON asumió.\n\nSEXTA. CONSUMO VARIABLE.\n\nLas unidades, tarifa, fuente de medición, alertas y presupuesto autorizado serán:\n\n{{recurrentes.consumo_y_topes}}.\n\nZYTERON no contratará ampliaciones ni extras fuera del límite aceptado sin aprobación, salvo medidas urgentes previamente autorizadas y delimitadas.\n\nEl CLIENTE podrá consultar el respaldo del consumo facturado.\n\nSÉPTIMA. VARIACIONES DE TARIFA.\n\nLos honorarios propios solo variarán por el mecanismo objetivo expresamente pactado en {{recurrentes.reajuste}} o mediante nuevo acuerdo.\n\nLos cambios de costos de terceros deberán acreditarse y notificarse bajo {{recurrentes.aviso_cambios}}; no autorizan aumentar otros componentes.\n\nSi no existe una fórmula válida previamente aceptada que cubra el cambio, se solicitará aprobación.\n\nEl silencio no constituye aceptación de un precio nuevo.\n\nAnte desacuerdo se evaluará mantener el alcance, migrar o terminar el servicio afectado sin penalidad por el mero rechazo, liquidando prestaciones y compromisos previamente autorizados.\n\nNinguna disposición desplaza las protecciones legales aplicables.\n\nOCTAVA. FACTURACIÓN Y PAGO.\n\nLa modalidad anticipada o vencida, períodos, vencimientos y prorrateos serán:\n\n{{recurrentes.facturacion}}.\n\nLos pagos se sujetan a la cláusula legal del contrato.\n\nUna factura vencida no autoriza un cargo bancario sin mandato.\n\nNOVENA. COBRO AUTOMÁTICO OPCIONAL.\n\nEl uso de cargo recurrente requiere autorización separada que indique proveedor de pagos, servicios, periodicidad, monto o regla determinable, avisos y revocación.\n\nNo se incluyen mandatos ilimitados.\n\nRevocar el cargo automático no extingue por sí solo deudas válidas ni sustituye la solicitud de término del servicio.\n\nZYTERON no almacenará CVV ni credenciales bancarias del CLIENTE.\n\nDÉCIMA. RENOVACIÓN Y CANCELACIÓN.\n\nEl plazo y modalidad serán:\n\n{{recurrentes.vigencia_y_renovacion}}.\n\nLa renovación automática solo operará si fue aceptada expresamente.\n\nSe informarán los avisos y canales de término de:\n\n{{recurrentes.cancelacion}}.\n\nLos compromisos anuales o no recuperables se detallarán antes de su contratación; no se crearán retroactivamente.\n\nUNDÉCIMA. INCUMPLIMIENTO Y CONTINUIDAD.\n\nLa suspensión se sujetará a avisos, oportunidad de regularización y proporcionalidad establecidos en {{recurrentes.suspension}} y en el contrato.\n\nNo se eliminarán datos como método de cobranza.\n\nLa restricción de un proveedor externo se informará con alternativas razonables cuando existan; ZYTERON conservará sus obligaciones propias.\n\nDUODÉCIMA. SALIDA Y PORTABILIDAD.\n\nSe aplicará:\n\n{{recurrentes.transicion}}.\n\nEste régimen identificará activos, formatos de exportación, responsables, costos adicionales autorizados y período de entrega.\n\nNo se condicionará la devolución legalmente exigible de datos a contratar una renovación.\n\nEl término del soporte no extingue licencias perpetuas ya pagadas.\n\nLa terminación de una suscripción no transfiere la propiedad de la plataforma del proveedor.\n\nLas Partes aceptan las tablas y condiciones de este anexo.\n\nFirmas:\n{{bloque.firmas_partes}}.",
    "variables": [
      "bloque.firmas_partes",
      "contrato.numero",
      "proyecto.codigo",
      "recurrentes.alcance",
      "recurrentes.aviso_cambios",
      "recurrentes.canales",
      "recurrentes.cancelacion",
      "recurrentes.consumo_y_topes",
      "recurrentes.exclusiones",
      "recurrentes.facturacion",
      "recurrentes.horarios_y_zona",
      "recurrentes.modalidad_costos",
      "recurrentes.reajuste",
      "recurrentes.respaldos",
      "recurrentes.suspension",
      "recurrentes.transicion",
      "recurrentes.vigencia_y_renovacion",
      "tabla.servicios_recurrentes",
      "tabla.sla"
    ]
  },
  {
    "code": "ZT-DATOS-CL",
    "name": "Anexo 3 — Encargo de tratamiento de datos",
    "category": "ANNEX",
    "body": "====================================================================\n\nANEXO 3 DEL CONTRATO {{contrato.numero}}\n\nPRIMERA. ROLES Y OBJETO.\n\nRespecto de los tratamientos identificados en {{datos.ficha_encargo}}, el CLIENTE determina la finalidad y encarga a ZYTERON las operaciones necesarias para {{datos.finalidad}}.\n\nSe identifican categorías de datos y titulares, operaciones, duración, sistemas y contactos.\n\nCada Parte conserva sus responsabilidades sobre tratamientos propios, como facturación o administración de su personal.\n\nSEGUNDA. INSTRUCCIONES Y LEGITIMIDAD.\n\nEl CLIENTE entregará instrucciones documentadas y contará con las habilitaciones y avisos exigibles para el tratamiento encomendado.\n\nZYTERON no utilizará los datos para publicidad propia, venta de bases, entrenamiento de IA ni otros fines ajenos.\n\nSi detecta una instrucción aparentemente ilícita, advertirá y suspenderá esa operación específica hasta aclararla.\n\nTERCERA. PERSONAL Y SEGURIDAD.\n\nZYTERON aplicará las medidas individualizadas en {{datos.medidas_seguridad}}, con responsabilidades y evidencias verificables.\n\nEl acceso se limitará al personal necesario sujeto a reserva.\n\nLas pruebas usarán datos sintéticos o debidamente protegidos.\n\nLos datos sensibles requieren autorización e identificación expresa y medidas acordes al riesgo.\n\nCUARTA. SUBENCARGADOS Y UBICACIONES.\n\nSolo podrán intervenir los subencargados específicamente autorizados por escrito en {{datos.subencargados_autorizados}}, con servicio, datos involucrados y ubicaciones efectivas.\n\nUn nuevo subencargo requerirá autorización específica antes del acceso.\n\nZYTERON impondrá obligaciones compatibles y conservará las responsabilidades legales correspondientes.\n\nLas transferencias internacionales deberán contar con fundamento y resguardos aplicables; este anexo no presume autorizadas todas las transferencias.\n\nQUINTA. INCIDENTES Y COOPERACIÓN.\n\nZYTERON notificará al contacto {{datos.contacto_incidentes}} sin demora indebida un incidente que afecte los datos encomendados y aportará progresivamente la información disponible, acciones de contención y medidas de recuperación.\n\nEl plazo operativo máximo pactado será {{datos.plazo_notificacion}}, sin ampliar obligaciones legales más exigentes.\n\nCooperará en solicitudes de titulares y requerimientos de autoridades dentro de sus funciones.\n\nSEXTA. VERIFICACIÓN.\n\nZYTERON facilitará información razonable sobre el cumplimiento de este encargo.\n\nLas revisiones acordadas se realizarán con confidencialidad, alcance proporcional y sin acceso a información de otros clientes ni afectación innecesaria del servicio.\n\nUna investigación justificada por incidente no se tratará como un acceso ordinario sin prioridad.\n\nSÉPTIMA. TÉRMINO Y CONSERVACIÓN.\n\nConcluido el encargo, los datos se devolverán o suprimirán conforme a {{datos.devolucion_y_retencion}}, incluyendo tratamiento de respaldos y constancia de ejecución.\n\nLos antecedentes cuya conservación sea legalmente necesaria permanecerán bloqueados para otros usos y se eliminarán cuando cese su fundamento.\n\nNinguna autorización comercial permite conservarlos indefinidamente.\n\nOCTAVA. NORMATIVA Y SUBSISTENCIA.\n\nEste encargo se ejecutará bajo la normativa chilena de datos personales aplicable en cada momento, incluyendo las modificaciones de la Ley N.º 21.719 desde su entrada en vigor.\n\nLa reserva y las obligaciones de conservación o eliminación subsistirán mientras proceda.\n\nEl anexo no limita derechos de titulares ni atribuciones de autoridades.\n\nFirmas:\n{{bloque.firmas_partes}}.",
    "variables": [
      "bloque.firmas_partes",
      "contrato.numero",
      "datos.contacto_incidentes",
      "datos.devolucion_y_retencion",
      "datos.ficha_encargo",
      "datos.finalidad",
      "datos.medidas_seguridad",
      "datos.plazo_notificacion",
      "datos.subencargados_autorizados"
    ]
  },
  {
    "code": "ZT-CAMBIO-CL",
    "name": "Orden de cambio y reprogramación",
    "category": "CHANGE_ORDER",
    "body": "====================================================================\n\nORDEN DE CAMBIO N.º {{cambio.numero}}\n\nContrato {{contrato.numero}} — Proyecto {{proyecto.codigo}}\n\nLas Partes individualizadas en el contrato acuerdan modificar exclusivamente:\n\nSolicitud y motivo:\n{{cambio.motivo}}.\n\nAlcance anterior:\n{{cambio.alcance_anterior}}.\n\nAlcance resultante y exclusiones:\n{{cambio.alcance_nuevo}}.\n\nEntregables y aceptación:\n{{cambio.entregables}}.\n\nEfecto en precio, impuestos y pagos:\n{{cambio.impacto_economico}}.\n\nEfecto en hitos y calendario:\n{{cambio.impacto_plazos}}.\n\nDependencias y responsables:\n{{cambio.dependencias}}.\n\nEfecto en servicios recurrentes:\n{{cambio.impacto_recurrentes}}.\n\nEfecto en propiedad intelectual, datos y seguridad:\n{{cambio.impacto_legal_tecnico}}.\n\nFecha o condición de vigencia:\n{{cambio.vigencia}}.\n\nCotización adicional y versión, si existe:\n{{cambio.cotizacion_o_no_aplica}}.\n\nLos aspectos sin modificación se identificarán como “sin cambio”, no quedarán vacíos.\n\nEl resto del contrato permanece vigente.\n\nEsta orden no reconoce trabajos, cobros o aceptaciones diferentes de los expresamente descritos.\n\nSu ejecución requiere aceptación de representantes con facultades.\n\nFirmas:\n{{bloque.firmas_partes}}.",
    "variables": [
      "bloque.firmas_partes",
      "cambio.alcance_anterior",
      "cambio.alcance_nuevo",
      "cambio.cotizacion_o_no_aplica",
      "cambio.dependencias",
      "cambio.entregables",
      "cambio.impacto_economico",
      "cambio.impacto_legal_tecnico",
      "cambio.impacto_plazos",
      "cambio.impacto_recurrentes",
      "cambio.motivo",
      "cambio.numero",
      "cambio.vigencia",
      "contrato.numero",
      "proyecto.codigo"
    ]
  }
] as const;

/**
 * Textos contractuales provistos para Zyteron Control.
 * Permanecen en LEGAL_REVIEW_REQUIRED hasta aprobación profesional verificable.
 */
export const chileanContractTemplates:ChileanContractTemplate[]=source.map(item=>({
  ...item,
  status:"LEGAL_REVIEW_REQUIRED",
  version:1,
  variables:definitions([...item.variables]),
}));

export const contractTemplateByCode=(code:string)=>chileanContractTemplates.find(item=>item.code===code);
