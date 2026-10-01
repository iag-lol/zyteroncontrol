import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { SalesQuote } from "@zyteron/contracts";

const escapePdf = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ").replace(/[()\\]/g, (match) => `\\${match}`);
const clip = (value: string, maximum: number) => value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
const date = (value?: string | null) => {
  if (!value) return "No informada";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  const parts = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(parsed);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")}`;
};
const money = (value: number, currency: string) => `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(value)} ${currency}`;
const text = (font: "F1" | "F2", size: number, x: number, y: number, value: string, color = "0.12 0.10 0.16") => `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdf(value)}) Tj ET`;

@Injectable()
export class QuoteDocumentService {
  render(quote: SalesQuote) {
    const itemsPerPage = 12;
    const chunks = quote.items.length ? Array.from({ length: Math.ceil(quote.items.length / itemsPerPage) }, (_, index) => quote.items.slice(index * itemsPerPage, index * itemsPerPage + itemsPerPage)) : [[]];
    const generatedAt = date(new Date().toISOString());
    const pages = chunks.map((items, pageIndex) => {
      const commands: string[] = [
        "0.12 0.07 0.25 rg 0 742 595 100 re f",
        "0.70 0.95 0.24 rg 40 775 36 36 re f",
        text("F2", 24, 51, 783, "Z", "0.07 0.16 0.12"),
        text("F2", 18, 90, 794, "ZYTERON", "1 1 1"),
        text("F1", 8, 90, 779, "CONTROL · SALES OPERATIONS", "0.82 0.78 0.91"),
        text("F2", 19, 390, 793, "COTIZACION", "1 1 1"),
        text("F1", 9, 390, 776, `${quote.quoteNumber} · V${quote.version}`, "0.90 0.87 0.95"),
        text("F1", 7, 40, 724, "ZYTERON SPA", "0.43 0.31 0.66"),
        text("F2", 14, 40, 704, clip(quote.companyName, 58)),
        text("F1", 9, 40, 687, `Contacto: ${quote.contactName || "No informado"}`),
        text("F1", 9, 40, 672, `Email: ${quote.contactEmail || "No informado"}`),
        text("F1", 9, 365, 704, `Emision: ${generatedAt}`),
        text("F1", 9, 365, 687, `Vigencia: ${date(quote.validUntil)}`),
        text("F1", 9, 365, 672, `Moneda: ${quote.currency}`),
        "0.88 0.86 0.91 RG 40 653 m 555 653 l S",
        text("F2", 9, 44, 635, "SERVICIO / ALCANCE", "0.43 0.31 0.66"),
        text("F2", 9, 342, 635, "CANT.", "0.43 0.31 0.66"),
        text("F2", 9, 402, 635, "PRECIO", "0.43 0.31 0.66"),
        text("F2", 9, 492, 635, "SUBTOTAL", "0.43 0.31 0.66"),
      ];
      let y = 613;
      for (const item of items) {
        commands.push(text("F1", 8, 44, y, clip(item.description, 56)));
        commands.push(text("F1", 8, 350, y, String(item.quantity)));
        commands.push(text("F1", 8, 400, y, money(item.unitPrice, quote.currency)));
        commands.push(text("F2", 8, 490, y, money(item.subtotal, quote.currency)));
        if (item.discountPercent > 0) commands.push(text("F1", 7, 44, y - 12, `Descuento aplicado: ${item.discountPercent}%`, "0.52 0.34 0.16"));
        commands.push(`0.93 0.92 0.95 RG 40 ${y - 19} m 555 ${y - 19} l S`);
        y -= 32;
      }
      if (pageIndex === chunks.length - 1) {
        const totalY = Math.max(90, y - 130);
        commands.push("0.96 0.95 0.98 rg 330 " + (totalY - 8) + " 225 112 re f");
        commands.push(text("F1", 9, 350, totalY + 82, "Subtotal"), text("F2", 9, 455, totalY + 82, money(quote.subtotal, quote.currency)));
        commands.push(text("F1", 9, 350, totalY + 62, "Descuento"), text("F2", 9, 455, totalY + 62, money(quote.discountTotal, quote.currency)));
        commands.push(text("F1", 9, 350, totalY + 42, `IVA (${quote.taxRate}%)`), text("F2", 9, 455, totalY + 42, money(quote.taxAmount, quote.currency)));
        commands.push(text("F2", 11, 350, totalY + 16, "TOTAL"), text("F2", 12, 455, totalY + 16, money(quote.totalAmount, quote.currency), "0.35 0.20 0.60"));
        commands.push(text("F2", 8, 40, totalY + 82, "FORMA DE PAGO", "0.43 0.31 0.66"), text("F1", 8, 40, totalY + 66, clip(quote.paymentTerms || "Por acordar", 50)));
        commands.push(text("F2", 8, 40, totalY + 42, "CONDICIONES COMERCIALES", "0.43 0.31 0.66"), text("F1", 8, 40, totalY + 26, clip(quote.commercialTerms || "Sin condiciones adicionales", 55)));
        if (quote.notes) commands.push(text("F1", 7, 40, totalY + 9, `Notas: ${clip(quote.notes, 70)}`, "0.40 0.38 0.44"));
      }
      commands.push("0.12 0.07 0.25 rg 0 0 595 42 re f");
      commands.push(text("F1", 7, 40, 17, "Documento confidencial · Generado por Zyteron Control", "0.82 0.78 0.91"));
      commands.push(text("F1", 7, 505, 17, `${pageIndex + 1} / ${chunks.length}`, "0.82 0.78 0.91"));
      return commands.join("\n");
    });

    const objects = new Map<number, string>();
    const pageIds = pages.map((_, index) => 6 + index * 2);
    objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
    objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    objects.set(5, "<< /Producer (Zyteron Control) /Title (Cotizacion comercial) >>");
    pages.forEach((content, index) => {
      const pageId = pageIds[index]!;
      const contentId = pageId + 1;
      objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects.set(contentId, `<< /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream`);
    });
    const maximumId = Math.max(...objects.keys());
    let body = "%PDF-1.4\n";
    const offsets = Array<number>(maximumId + 1).fill(0);
    for (let id = 1; id <= maximumId; id += 1) {
      offsets[id] = Buffer.byteLength(body);
      body += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
    }
    const xref = Buffer.byteLength(body);
    body += `xref\n0 ${maximumId + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${maximumId + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = Buffer.from(body, "binary");
    return { bytes, hash: createHash("sha256").update(bytes).digest("hex"), filename: `${quote.quoteNumber}-V${quote.version}.pdf` };
  }
}
