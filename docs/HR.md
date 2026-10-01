# People Operations Center

`/hr` administra la identidad laboral sin confundirla con Supabase Auth. El modelo central es `employees` → `employment_relationships`; una persona puede existir antes de tener usuario y conserva todos sus períodos laborales.

El dominio se divide en personas, organización, contratos, onboarding/offboarding, ausencias, payroll, LRE, activos, desempeño y capacitación. Los eventos se publican en `hr_events` y el outbox empresarial. No se cargan colaboradores ni operaciones ficticias.

Fechas civiles se almacenan como `date`; instantes, en UTC. La interfaz presenta `DD-MM-AAAA`, hora 24 horas y zona `America/Santiago`.
