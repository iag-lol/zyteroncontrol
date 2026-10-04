# Backup and Disaster Recovery

Cada target registra proveedor, RPO/RTO, retención, cifrado, último/próximo backup y evidencia. Ningún backup se declara validado hasta existir `recovery_tests.result=PASSED` con validación de datos.

Evaluar copia independiente y credenciales separadas. Los planes cubren pérdida DB, corrupción Storage, caída Render, DNS, Supabase, GitHub y credenciales. Sin proveedor/evidencia el Gate falla.
