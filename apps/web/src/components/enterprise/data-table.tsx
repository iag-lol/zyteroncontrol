import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";

export function DataTable({ columns, rows, emptyMessage }: { columns: string[]; rows: ReactNode[][]; emptyMessage: string }) {
  if (!rows.length) return <div className="dataTableEmpty"><EmptyState title="Sin registros" description={emptyMessage} /></div>;
  return <div className="dataTableWrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

