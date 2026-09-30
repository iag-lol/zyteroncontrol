import { Search, SlidersHorizontal } from "lucide-react";

export function FilterBar({ placeholder = "Buscar registros" }: { placeholder?: string }) {
  return <div className="filterBar"><label><Search size={15} /><input placeholder={placeholder} /></label><button type="button"><SlidersHorizontal size={15} />Filtros</button></div>;
}

