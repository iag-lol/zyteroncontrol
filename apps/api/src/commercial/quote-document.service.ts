import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { SalesQuote } from "@zyteron/contracts";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 43;
const RIGHT = PAGE_WIDTH - 43;
const CONTENT_WIDTH = RIGHT - LEFT;

const navy = rgb(0.035, 0.075, 0.17);
const blue = rgb(0.055, 0.35, 0.93);
const teal = rgb(0.02, 0.72, 0.68);
const slate = rgb(0.32, 0.40, 0.53);
const lightSlate = rgb(0.54, 0.61, 0.70);
const line = rgb(0.84, 0.88, 0.93);
const soft = rgb(0.965, 0.975, 0.985);
const white = rgb(1, 1, 1);

export interface QuoteDocumentContext {
  preview?: boolean;
  recipient?: {
    rut?: string | null;
    businessActivity?: string | null;
    address?: string | null;
    phone?: string | null;
  };
}

const clean = (value?: string | null) => (value ?? "").split("").map((character) => character.charCodeAt(0) < 32 ? " " : character).join("").replace(/\s+/g, " ").trim();

const dateLong = (value?: string | null) => {
  if (!value) return "No informada";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const money = (value: number, currency: string) => {
  const formatted = new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: currency === "CLP" ? 0 : 2,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  if (currency === "CLP") return `${sign}$${formatted}`;
  if (currency === "USD") return `${sign}US$ ${formatted}`;
  return `${sign}UF ${formatted}`;
};

const wrap = (value: string, font: PDFFont, size: number, maximumWidth: number) => {
  const words = clean(value).split(" ").filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maximumWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) <= maximumWidth) {
      current = word;
      continue;
    }
    let fragment = "";
    for (const character of word) {
      if (font.widthOfTextAtSize(fragment + character, size) > maximumWidth) {
        lines.push(fragment);
        fragment = character;
      } else fragment += character;
    }
    current = fragment;
  }
  if (current) lines.push(current);
  return lines;
};

const rightText = (page: PDFPage, value: string, x: number, y: number, width: number, font: PDFFont, size: number, color = navy) => {
  page.drawText(value, { x: x + width - font.widthOfTextAtSize(value, size), y, font, size, color });
};

const drawLogo = (page: PDFPage, x: number, y: number, boldItalic: PDFFont) => {
  page.drawEllipse({ x: x + 25, y: y + 23, xScale: 25, yScale: 17, borderColor: teal, borderWidth: 2.2 });
  page.drawEllipse({ x: x + 28, y: y + 21, xScale: 26, yScale: 12, borderColor: blue, borderWidth: 1.4 });
  page.drawText("Z", { x: x + 12, y: y + 7, font: boldItalic, size: 30, color: navy });
  page.drawCircle({ x: x + 49, y: y + 29, size: 3.4, color: blue });
  page.drawCircle({ x: x + 7, y: y + 12, size: 3.4, color: teal });
};

@Injectable()
export class QuoteDocumentService {
  async render(quote: SalesQuote, context: QuoteDocumentContext = {}) {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const boldItalic = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
    const pages: PDFPage[] = [];
    const issuedAt = dateLong(quote.createdAt || new Date().toISOString());
    const issuer = {
      name: clean(process.env.QUOTE_ISSUER_NAME) || "Zyteron SpA",
      rut: clean(process.env.QUOTE_ISSUER_RUT) || "78.398.774-0",
      activity: clean(process.env.QUOTE_ISSUER_ACTIVITY) || "Servicios de informática y desarrollo de software",
      address: clean(process.env.QUOTE_ISSUER_ADDRESS) || "Santiago, Chile",
      website: clean(process.env.QUOTE_ISSUER_WEBSITE) || "www.zyteron.cl",
      email: clean(process.env.QUOTE_ISSUER_EMAIL) || "contacto@zyteron.cl",
      phone: clean(process.env.QUOTE_ISSUER_PHONE),
    };

    pdf.setTitle(`Cotización ${quote.quoteNumber}`);
    pdf.setAuthor(issuer.name);
    pdf.setSubject(`Propuesta comercial para ${quote.companyName}`);
    pdf.setCreator("Zyteron Control · QuoteDocumentService V2");
    pdf.setKeywords(["cotización", quote.quoteNumber, quote.companyName]);

    const header = (continuation = false) => {
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 7, width: PAGE_WIDTH * 0.46, height: 7, color: teal });
      page.drawRectangle({ x: PAGE_WIDTH * 0.46, y: PAGE_HEIGHT - 7, width: PAGE_WIDTH * 0.54, height: 7, color: blue });
      drawLogo(page, LEFT, PAGE_HEIGHT - 91, boldItalic);
      page.drawText("ZYTERON", { x: 110, y: PAGE_HEIGHT - 56, font: bold, size: 21, color: navy });
      page.drawText("Desarrollo web y soluciones tecnológicas empresariales", { x: 110, y: PAGE_HEIGHT - 72, font: regular, size: 7.5, color: slate });
      page.drawText([issuer.website, issuer.email, issuer.phone].filter(Boolean).join("  ·  "), { x: 110, y: PAGE_HEIGHT - 84, font: regular, size: 7.2, color: lightSlate });
      rightText(page, continuation ? "COTIZACIÓN · CONTINUACIÓN" : "C O T I Z A C I Ó N", 337, PAGE_HEIGHT - 49, 215, bold, continuation ? 8 : 10, slate);
      rightText(page, quote.quoteNumber, 337, PAGE_HEIGHT - 68, 215, bold, 17, navy);
      rightText(page, `Versión ${quote.version} · Emitida el ${issuedAt}`, 337, PAGE_HEIGHT - 82, 215, regular, 7.5, slate);
      page.drawLine({ start: { x: LEFT, y: PAGE_HEIGHT - 103 }, end: { x: RIGHT, y: PAGE_HEIGHT - 103 }, color: line, thickness: 0.8 });
      return page;
    };

    const tableHeader = (page: PDFPage, y: number) => {
      page.drawRectangle({ x: LEFT, y: y - 23, width: CONTENT_WIDTH, height: 23, color: navy });
      page.drawText("DESCRIPCIÓN", { x: LEFT + 9, y: y - 15, font: bold, size: 7.5, color: white });
      rightText(page, "CANT.", 326, y - 15, 43, bold, 7.5, white);
      rightText(page, "PRECIO UNIT.", 372, y - 15, 74, bold, 7.5, white);
      rightText(page, "DCTO.", 449, y - 15, 41, bold, 7.5, white);
      rightText(page, "TOTAL", 493, y - 15, 56, bold, 7.5, white);
      return y - 23;
    };

    let page = header(false);
    page.drawRectangle({ x: LEFT, y: 645, width: CONTENT_WIDTH, height: 79, color: soft, borderColor: line, borderWidth: 0.7 });
    page.drawLine({ start: { x: 300, y: 657 }, end: { x: 300, y: 712 }, color: line, thickness: 0.8 });
    page.drawText("EMISOR", { x: 56, y: 703, font: bold, size: 7.5, color: blue });
    page.drawText(issuer.name, { x: 56, y: 687, font: bold, size: 10.5, color: navy });
    page.drawText(`RUT ${issuer.rut}`, { x: 56, y: 674, font: regular, size: 7.5, color: slate });
    page.drawText(issuer.activity, { x: 56, y: 662, font: regular, size: 7.1, color: slate });
    page.drawText("PREPARADA PARA", { x: 317, y: 703, font: bold, size: 7.5, color: blue });
    page.drawText(clean(quote.companyName), { x: 317, y: 687, font: bold, size: 10.5, color: navy });
    const recipientContact = [clean(quote.contactName) || "Contacto por confirmar", clean(quote.contactEmail)].filter(Boolean).join(" · ");
    page.drawText(wrap(recipientContact, regular, 7.5, RIGHT - 317)[0] ?? recipientContact, { x: 317, y: 674, font: regular, size: 7.5, color: slate });
    const recipientDetails = [
      context.recipient?.rut ? `RUT ${context.recipient.rut}` : null,
      context.recipient?.address,
      context.recipient?.phone,
    ].filter(Boolean) as string[];
    recipientDetails.slice(0, 2).forEach((detail, index) => page.drawText(clean(detail), { x: 317, y: 662 - index * 11, font: regular, size: 7.1, color: slate }));

    const summary = clean(quote.notes) || `Propuesta comercial preparada para ${quote.companyName}, que considera ${quote.items.length} ${quote.items.length === 1 ? "servicio" : "servicios"} según el alcance y las condiciones detalladas en este documento.`;
    page.drawRectangle({ x: LEFT, y: 595, width: 3, height: 31, color: blue });
    page.drawText("RESUMEN DE LA PROPUESTA", { x: LEFT + 10, y: 618, font: bold, size: 7.4, color: slate });
    wrap(summary, regular, 8.2, CONTENT_WIDTH - 16).slice(0, 2).forEach((value, index) => page.drawText(value, { x: LEFT + 10, y: 603 - index * 10, font: regular, size: 8.2, color: navy }));
    page.drawText("DETALLE DE SERVICIOS", { x: LEFT, y: 573, font: bold, size: 7.5, color: blue });
    let y = tableHeader(page, 559);

    for (let index = 0; index < quote.items.length; index += 1) {
      const item = quote.items[index]!;
      const descriptionLines = wrap(item.description, bold, 8.2, 268).slice(0, 3);
      const rowHeight = Math.max(34, 17 + descriptionLines.length * 10);
      if (y - rowHeight < 333) {
        page = header(true);
        page.drawText("DETALLE DE SERVICIOS", { x: LEFT, y: 705, font: bold, size: 7.5, color: blue });
        y = tableHeader(page, 691);
      }
      if (index % 2 === 1) page.drawRectangle({ x: LEFT, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: soft });
      descriptionLines.forEach((value, lineIndex) => page.drawText(value, { x: LEFT + 9, y: y - 15 - lineIndex * 10, font: lineIndex === 0 ? bold : regular, size: 8.2, color: lineIndex === 0 ? navy : slate }));
      rightText(page, new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(item.quantity), 326, y - 17, 43, regular, 7.6, slate);
      rightText(page, money(item.unitPrice, quote.currency), 372, y - 17, 74, regular, 7.6, slate);
      rightText(page, item.discountPercent ? `${item.discountPercent}%` : "—", 449, y - 17, 41, regular, 7.6, slate);
      rightText(page, money(item.subtotal, quote.currency), 493, y - 17, 56, bold, 7.6, navy);
      page.drawLine({ start: { x: LEFT, y: y - rowHeight }, end: { x: RIGHT, y: y - rowHeight }, color: line, thickness: 0.55 });
      y -= rowHeight;
    }

    if (y < 326) {
      page = header(true);
      y = 704;
    }

    const blockTop = y - 17;
    page.drawText("CONDICIONES DE PAGO", { x: LEFT, y: blockTop, font: bold, size: 7.5, color: blue });
    wrap(clean(quote.paymentTerms) || "Condiciones de pago por acordar.", regular, 8.2, 270).slice(0, 3).forEach((value, index) => page.drawText(value, { x: LEFT, y: blockTop - 17 - index * 11, font: regular, size: 8.2, color: navy }));
    const bankConfigured = Boolean(clean(process.env.QUOTE_BANK_ACCOUNT_NUMBER));
    page.drawRectangle({ x: LEFT, y: blockTop - 107, width: 278, height: 48, color: rgb(0.94, 0.965, 1), borderColor: blue, borderWidth: 0.75 });
    page.drawText("DATOS PARA TRANSFERENCIA", { x: LEFT + 9, y: blockTop - 74, font: bold, size: 7.2, color: blue });
    const bankLine = bankConfigured
      ? [clean(process.env.QUOTE_BANK_NAME), clean(process.env.QUOTE_BANK_ACCOUNT_TYPE), `N° ${clean(process.env.QUOTE_BANK_ACCOUNT_NUMBER)}`].filter(Boolean).join(" · ")
      : "Datos bancarios informados por el canal comercial autorizado.";
    page.drawText(bankLine, { x: LEFT + 9, y: blockTop - 91, font: regular, size: 7.4, color: navy });
    if (bankConfigured) page.drawText(`${issuer.name} · RUT ${issuer.rut}`, { x: LEFT + 9, y: blockTop - 102, font: regular, size: 7, color: slate });

    const totalsX = 346;
    const totalsWidth = RIGHT - totalsX;
    page.drawRectangle({ x: totalsX, y: blockTop - 125, width: totalsWidth, height: 130, color: white, borderColor: line, borderWidth: 0.75 });
    const totals = [["Subtotal", quote.subtotal], ["Descuento", -quote.discountTotal], ["Neto", quote.netAmount], [`IVA (${quote.taxRate}%)`, quote.taxAmount]] as const;
    totals.forEach(([label, value], index) => {
      page.drawText(label, { x: totalsX + 12, y: blockTop - 18 - index * 16, font: regular, size: 8.1, color: slate });
      rightText(page, money(value, quote.currency), totalsX + 82, blockTop - 18 - index * 16, totalsWidth - 94, bold, 8.1, navy);
    });
    page.drawRectangle({ x: totalsX, y: blockTop - 114, width: totalsWidth, height: 31, color: navy });
    page.drawText("TOTAL", { x: totalsX + 12, y: blockTop - 104, font: bold, size: 9.3, color: white });
    rightText(page, money(quote.totalAmount, quote.currency), totalsX + 75, blockTop - 105, totalsWidth - 87, bold, 13, white);
    page.drawText(`Valores expresados en ${quote.currency}.`, { x: totalsX + 4, y: blockTop - 123, font: regular, size: 6.7, color: lightSlate });

    const termsY = blockTop - 155;
    page.drawText("TÉRMINOS Y CONDICIONES", { x: LEFT, y: termsY, font: bold, size: 7.5, color: slate });
    const terms = [
      clean(quote.commercialTerms),
      "Alcance: se incluye únicamente lo descrito en este documento; cualquier requerimiento adicional se cotizará por separado.",
      `Impuestos: el IVA se presenta desglosado a una tasa de ${quote.taxRate}% sobre los ítems afectos.`,
      `Vigencia: esta cotización es válida hasta el ${dateLong(quote.validUntil)}.`,
    ].filter(Boolean).join(" ");
    wrap(terms, regular, 6.8, 295).slice(0, 10).forEach((value, index) => page.drawText(value, { x: LEFT, y: termsY - 15 - index * 8.2, font: regular, size: 6.8, color: slate }));
    page.drawText("ACEPTACIÓN DEL CLIENTE", { x: 351, y: termsY, font: bold, size: 7.5, color: slate });
    page.drawLine({ start: { x: 351, y: termsY - 54 }, end: { x: RIGHT, y: termsY - 54 }, color: lightSlate, thickness: 0.75 });
    page.drawText("Nombre, RUT y firma", { x: 351, y: termsY - 67, font: regular, size: 6.8, color: lightSlate });

    pages.forEach((current, index) => {
      current.drawLine({ start: { x: LEFT, y: 38 }, end: { x: RIGHT, y: 38 }, color: line, thickness: 0.65 });
      current.drawText(`${issuer.name} · RUT ${issuer.rut} · ${issuer.address}`, { x: LEFT, y: 23, font: regular, size: 6.6, color: slate });
      rightText(current, `${issuer.website} · ${index + 1} / ${pages.length}`, 345, 23, RIGHT - 345, bold, 6.6, blue);
      current.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH * 0.46, height: 3, color: teal });
      current.drawRectangle({ x: PAGE_WIDTH * 0.46, y: 0, width: PAGE_WIDTH * 0.54, height: 3, color: blue });
      if (context.preview) current.drawText("BORRADOR · NO EMITIDO", { x: 176, y: 410, font: bold, size: 24, color: slate, opacity: 0.09, rotate: degrees(32) });
    });

    const bytes = Buffer.from(await pdf.save({ useObjectStreams: false }));
    return {
      bytes,
      hash: createHash("sha256").update(bytes).digest("hex"),
      filename: `${quote.quoteNumber}-V${quote.version}.pdf`,
    };
  }
}
