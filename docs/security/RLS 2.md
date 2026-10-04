# Row Level Security

Las tablas Security habilitan RLS y niegan acceso anónimo. Sesiones, dispositivos, solicitudes y grants permiten lectura propia; administración se realiza mediante API autorizada. Eventos, Vault, incidentes y privacidad quedan restringidos a Security Admin/Gerencia y a la Service Role backend.

La suite requerida debe probar anon, owner, no-owner, manager, Client A/Client B y roles internos. RLS no reemplaza grants; las funciones `SECURITY DEFINER` fijan `search_path` y revocan ejecución pública.
