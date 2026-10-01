import { enterpriseNavigation } from "./navigation";
/** Ítems del grupo Finanzas del menú lateral (usado por tests de consistencia). */
export const navigation = enterpriseNavigation.find((group) => group.id === "finance")?.items ?? [];
