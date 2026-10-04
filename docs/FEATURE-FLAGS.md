# Feature Flags

Los flags se segmentan por entorno y alcance (`GLOBAL`, `ROLE`, `TEAM`, `USER`, `CLIENT` o `ENVIRONMENT`). Nacen deshabilitados; rollout se limita a 0–100 y la activación exige AAL2.

El kill switch es una operación auditada y se propaga mediante outbox. El código consumidor debe usar un default seguro cuando el flag no existe o el servicio no responde. Los flags no sustituyen permisos ni RLS.
