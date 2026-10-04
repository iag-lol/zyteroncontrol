export const environments=["DEVELOPMENT","STAGING","PRODUCTION"]as const;
export const valueTypes=["STRING","INTEGER","DECIMAL","BOOLEAN","ENUM","DURATION","JSON","SECRET_REFERENCE"]as const;
export const businessEvents=["CLIENT_CREATED","QUOTE_ACCEPTED","WORK_ORDER_CREATED","PROJECT_OVERDUE","TASK_BLOCKED","DEPLOYMENT_FAILED","WEBSITE_DOWN","INCIDENT_CONFIRMED","AUDIT_CRITICAL_FINDING","INVOICE_OVERDUE","PAYMENT_RECEIVED","TICKET_SLA_BREACHED","CONTRACT_EXPIRING","EMPLOYEE_OFFBOARDING_STARTED","SECURITY_CRITICAL_EVENT"]as const;
export const automationActions=["SEND_NOTIFICATION","SEND_EMAIL","CREATE_TASK","CREATE_TICKET","ASSIGN_USER","CHANGE_STATUS","CREATE_APPROVAL","ESCALATE","CREATE_REMINDER","TRIGGER_WEBHOOK"]as const;
export const conditionOperators=["equals","not_equals","in","greater_than","less_than","contains","exists","time_window","scope_match"]as const;
export const protectedInvariants=["security.rls.enabled","security.tenant_isolation.enabled","security.secret_protection.enabled","security.secure_storage.enabled"]as const;
export const dependencies=[
 {source:"EMAIL_PROVIDER",targets:["COMMERCIAL_QUOTES","SUPPORT","NOTIFICATIONS","SECURITY_ALERTS"],status:"ENFORCED"},
 {source:"DOCUMENTS",targets:["CONTRACTS","QUOTES","AUDITS","HR"],status:"CANONICAL"},
 {source:"SUPABASE",targets:["AUTH","DATABASE","REALTIME","STORAGE"],status:"CRITICAL"},
 {source:"SECURITY_VAULT",targets:["INTEGRATIONS","WEBHOOKS","AI","PAYMENTS","SIGNATURE"],status:"ENFORCED"},
 {source:"BUSINESS_CALENDAR",targets:["SUPPORT_SLA","HR","AUTOMATIONS"],status:"CANONICAL"},
];
export const integrationCatalog=[
 ["SUPABASE","Supabase","Platform","SYSTEM"],["GITHUB","GitHub","Development","DEVELOPMENT"],["RENDER","Render","Platform","SYSTEM"],["MERCADO_PAGO","Mercado Pago","Payments","FINANCE"],["SII_DTE","SII / DTE Provider","Tax","FINANCE"],["ELECTRONIC_SIGNATURE","Firma electrónica","Documents","DOCUMENTS"],["EMAIL","Email Provider","Notifications","NOTIFICATIONS"],["MICROSOFT_GRAPH","Microsoft Graph","Productivity","SYSTEM"],
]as const;
export const jobCatalog=[
 ["MONITOR_CHECKS","Monitor checks","MONITORING"],["RENEWALS","Renewals","CLIENTS"],["AUDIT_SCHEDULER","Audit scheduler","AUDITS"],["BILLING_SCHEDULES","Billing schedules","FINANCE"],["SLA_JOBS","SLA jobs","SUPPORT"],["RETENTION","Retention","SECURITY"],["SECURITY_SCANS","Security scans","SECURITY"],["BACKUP_CHECKS","Backup checks","SECURITY"],["NOTIFICATION_DELIVERY","Notification delivery","NOTIFICATIONS"],["AUTOMATION_WORKER","Automation worker","SETTINGS"],
]as const;
