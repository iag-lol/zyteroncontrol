# Contratos laborales

`employment_contracts` conserva metadata laboral y referencia un documento de clasificación `RESTRICTED` en Documents. `CTR-LAB-AAAA-000001` se genera mediante secuencia PostgreSQL, nunca con `COUNT + 1`.

El documento y la metadata tienen ciclos separados pero coordinados. Una versión firmada no se modifica: todo cambio posterior es un anexo. Sueldo, frecuencia y compensación histórica están protegidos por políticas específicas y no se entregan automáticamente a jefaturas técnicas.
