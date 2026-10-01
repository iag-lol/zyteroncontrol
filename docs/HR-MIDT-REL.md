# Mi DT y Registro Electrónico Laboral

`LaborAuthorityProvider` desacopla la plataforma del mecanismo oficial. La implementación inicial declara `EXTERNAL_MANUAL_WITH_EVIDENCE`: prepara checklist y enlace oficial, pero no automatiza ClaveÚnica ni realiza scraping.

Un contrato solo llega a `REGISTERED` mediante referencia oficial y comprobante de Documents. Los plazos provienen de `compliance_rules` versionadas; si no existe una regla vigente, la obligación queda `RULE_CONFIGURATION_REQUIRED` sin inventar una fecha.
