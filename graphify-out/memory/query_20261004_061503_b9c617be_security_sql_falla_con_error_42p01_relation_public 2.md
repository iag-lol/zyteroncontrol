---
type: "query"
date: "2026-10-04T06:15:03.331691+00:00"
question: "Security SQL falla con ERROR 42P01 relation public.documents does not exist"
contributor: "graphify"
outcome: "useful"
source_nodes: ["20261001080000_document_control_center.sql", "20261004010000_security_control_plane.sql", "documents.service.ts", "SecurityController"]
---

# Q: Security SQL falla con ERROR 42P01 relation public.documents does not exist

## Answer

Expanded from original query via vocab: [security, document, documents, evidence, report, project, projects, backup, target, migration, schema]. Security reutiliza public.documents para evidencia de incidentes, vulnerabilidades, scans, controles, proveedores, recuperacion, capacitacion e informes. public.documents se crea en 20261001080000_document_control_center.sql, que debe aplicarse antes de 20261004010000_security_control_plane.sql. Las demas relaciones externas de Security son clients y projects, ya creadas por Client 360 y Delivery; backup_targets se crea dentro del propio SQL de Security. Ejecutar Document Control completo, verificar documents y document_versions con to_regclass, y luego repetir Security completo; el intento fallido dentro de BEGIN se revierte.

## Outcome

- Signal: useful

## Source Nodes

- 20261001080000_document_control_center.sql
- 20261004010000_security_control_plane.sql
- documents.service.ts
- SecurityController