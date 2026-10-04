# Production Security Gate

Estados: PASS, PASS_WITH_EXCEPTION, FAIL. Bloquean: Critical abierta, secreto expuesto, RLS crítica, MFA privilegiada incompleta, backup no sano, restore no validado y scans obligatorios no aprobados.

Una excepción exige control, riesgo, justificación, control compensatorio, owner, aprobador y expiración. Nunca es permanente. La evaluación almacena snapshot de evidencia y emite evento crítico al fallar.
