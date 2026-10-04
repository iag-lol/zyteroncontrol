# Security API Inventory

Todos los endpoints están bajo `/api/security`, requieren JWT productivo, rol permitido y permiso explícito. Operaciones críticas además requieren AAL2.

Grupos: workspace/posture; users/identities/MFA/roles/permissions; sessions/devices; access requests/grants; Vault; events/incidents; vulnerabilities; RLS; privacy/data assets/processing/rights/DPIA/retention; DLP; vendors; backups/recovery/DR; testing/CI-CD; controls/compliance; gate; configuration; reports.

No existen endpoints públicos Security. Los límites de tasa deben implementarse en edge/API antes de producción completa.
