import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb, degrees } from 'pdf-lib';
import type { Booking, Listing, StorageAgreement, User } from '../types';
import { parseAgreementContent } from './storage-agreement';

const BRAND_NAVY = rgb(0.11, 0.2, 0.35);
const BRAND_BLUE = rgb(0.18, 0.44, 0.78);
const LIGHT_GREY = rgb(0.95, 0.96, 0.97);
const MID_GREY = rgb(0.6, 0.62, 0.65);
const RULE_GREY = rgb(0.82, 0.84, 0.87);
const TEXT_BLACK = rgb(0.1, 0.1, 0.12);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 52;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const TOP_MARGIN = 52;
const BOTTOM_MARGIN = 68;

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawRule(page: PDFPage, x: number, y: number, w: number, thickness = 0.5) {
  page.drawLine({
    start: { x, y },
    end: { x: x + w, y },
    thickness,
    color: RULE_GREY,
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface RenderCtx {
  doc: PDFDocument;
  bold: PDFFont;
  reg: PDFFont;
  italic: PDFFont;
  pages: PDFPage[];
}

class Cursor {
  y: number;
  private ctx: RenderCtx;
  page: PDFPage;
  pageIndex: number;

  constructor(ctx: RenderCtx, startY: number) {
    this.ctx = ctx;
    this.page = ctx.pages[0];
    this.pageIndex = 0;
    this.y = startY;
  }

  ensureSpace(needed: number): boolean {
    if (this.y - needed >= BOTTOM_MARGIN) return false;
    this.newPage();
    return true;
  }

  newPage() {
    const page = this.ctx.doc.addPage([PAGE_W, PAGE_H]);
    this.ctx.pages.push(page);
    this.page = page;
    this.pageIndex = this.ctx.pages.length - 1;
    this.y = PAGE_H - TOP_MARGIN;
    drawPageChrome(this.ctx, page, this.pageIndex);
  }

  move(dy: number) {
    this.y -= dy;
  }
}

function drawPageChrome(ctx: RenderCtx, page: PDFPage, pageIndex: number) {
  const isFirst = pageIndex === 0;

  drawRule(page, MARGIN_X, BOTTOM_MARGIN - 6, CONTENT_W, 0.5);
  page.drawText('WareShare Platform | Confidential', {
    x: MARGIN_X,
    y: BOTTOM_MARGIN - 20,
    font: ctx.italic,
    size: 7.5,
    color: MID_GREY,
  });
  page.drawText(`Page ${pageIndex + 1}`, {
    x: PAGE_W - MARGIN_X - 32,
    y: BOTTOM_MARGIN - 20,
    font: ctx.reg,
    size: 7.5,
    color: MID_GREY,
  });

  if (!isFirst) {
    drawRect(page, 0, PAGE_H - 28, PAGE_W, 28, BRAND_NAVY);
    page.drawText('WareShare - Storage Agreement (continued)', {
      x: MARGIN_X,
      y: PAGE_H - 19,
      font: ctx.bold,
      size: 8.5,
      color: WHITE,
    });
  }
}

export interface AgreementPdfInput {
  booking: Booking;
  listing: Listing;
  agreement: StorageAgreement;
  host: User;
  renter: User;
}

export async function renderAgreementPdf(input: AgreementPdfInput): Promise<Uint8Array> {
  const { booking, listing, agreement, host, renter } = input;
  const content = parseAgreementContent(agreement.content);

  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const firstPage = doc.addPage([PAGE_W, PAGE_H]);
  const ctx: RenderCtx = { doc, bold, reg, italic, pages: [firstPage] };

  drawPageChrome(ctx, firstPage, 0);
  const cur = new Cursor(ctx, PAGE_H - TOP_MARGIN);

  const headerH = 88;
  drawRect(firstPage, 0, PAGE_H - headerH, PAGE_W, headerH, BRAND_NAVY);
  firstPage.drawText('STORAGE AGREEMENT', {
    x: MARGIN_X,
    y: PAGE_H - 38,
    font: bold,
    size: 22,
    color: WHITE,
  });
  firstPage.drawText('WareShare Platform', {
    x: MARGIN_X,
    y: PAGE_H - 57,
    font: reg,
    size: 10.5,
    color: rgb(0.7, 0.8, 0.92),
  });
  firstPage.drawText(`Booking ID: ${booking.id}`, {
    x: MARGIN_X,
    y: PAGE_H - 74,
    font: italic,
    size: 8.5,
    color: rgb(0.6, 0.7, 0.85),
  });

  cur.y = PAGE_H - headerH - 22;

  if (agreement.status !== 'fully_accepted') {
    const label = agreement.status === 'draft' ? 'DRAFT' : 'PENDING SIGNATURES';
    firstPage.drawText(label, {
      x: 110,
      y: PAGE_H / 2 - 30,
      font: bold,
      size: 72,
      color: rgb(0.9, 0.92, 0.94),
      opacity: 0.35,
      rotate: degrees(35),
    });
  }

  cur.ensureSpace(52);
  const metaY = cur.y;
  drawRect(cur.page, MARGIN_X, metaY - 38, CONTENT_W, 44, LIGHT_GREY);

  const metaItems: Array<[string, string]> = [
    ['Generated', fmtDate(content.generated_at)],
    ['Status', agreement.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())],
    ['Agreement Ver.', content.version],
  ];
  const colW = CONTENT_W / metaItems.length;
  metaItems.forEach(([label, value], i) => {
    const x = MARGIN_X + i * colW + 10;
    cur.page.drawText(label, { x, y: metaY - 10, font: italic, size: 7.5, color: MID_GREY });
    cur.page.drawText(value, { x, y: metaY - 25, font: bold, size: 9, color: TEXT_BLACK });
  });
  cur.move(52);

  cur.ensureSpace(80);
  cur.move(10);
  drawPartyBlock(cur, 'HOST', host, bold, reg, italic);
  drawPartyBlock(cur, 'RENTER', renter, bold, reg, italic);
  cur.move(14);

  renderWarehouseDetails(cur, listing, bold, reg, italic);

  for (const section of content.sections) {
    renderSection(cur, section, bold, reg, italic);
  }

  renderSignatureBlock(cur, agreement, host, renter, bold, reg, italic);

  const totalPages = ctx.pages.length;
  for (let i = 0; i < totalPages; i++) {
    ctx.pages[i].drawText(`/ ${totalPages}`, {
      x: PAGE_W - MARGIN_X - 12,
      y: BOTTOM_MARGIN - 20,
      font: reg,
      size: 7.5,
      color: MID_GREY,
    });
  }

  return doc.save();
}

function drawPartyBlock(cur: Cursor, role: string, user: User, bold: PDFFont, reg: PDFFont, italic: PDFFont) {
  const blockW = (CONTENT_W - 14) / 2;
  const isHost = role === 'HOST';
  const bx = MARGIN_X + (isHost ? 0 : blockW + 14);

  cur.ensureSpace(64);
  const topY = cur.y;

  drawRect(cur.page, bx, topY - 56, blockW, 60, LIGHT_GREY);
  cur.page.drawText(role, {
    x: bx + 10,
    y: topY - 14,
    font: bold,
    size: 7.5,
    color: BRAND_BLUE,
  });
  cur.page.drawText(user.full_name, {
    x: bx + 10,
    y: topY - 28,
    font: bold,
    size: 10.5,
    color: TEXT_BLACK,
  });
  cur.page.drawText(user.email, {
    x: bx + 10,
    y: topY - 42,
    font: italic,
    size: 8.5,
    color: MID_GREY,
  });

  if (user.phone) {
    cur.page.drawText(user.phone, {
      x: bx + 10,
      y: topY - 54,
      font: reg,
      size: 8,
      color: MID_GREY,
    });
  }

  if (!isHost) cur.move(68);
}

function renderWarehouseDetails(cur: Cursor, listing: Listing, bold: PDFFont, reg: PDFFont, italic: PDFFont) {
  cur.ensureSpace(86);
  const titleY = cur.y;

  drawRect(cur.page, MARGIN_X, titleY - 22, CONTENT_W, 26, BRAND_NAVY);
  cur.page.drawText('WAREHOUSE LOCATION', {
    x: MARGIN_X + 10,
    y: titleY - 15,
    font: bold,
    size: 9,
    color: WHITE,
  });
  cur.move(30);

  drawRect(cur.page, MARGIN_X, cur.y - 46, CONTENT_W, 50, LIGHT_GREY);
  cur.page.drawText(listing.title, {
    x: MARGIN_X + 10,
    y: cur.y - 14,
    font: bold,
    size: 10,
    color: TEXT_BLACK,
  });

  const fullAddress = [listing.address, listing.city, listing.province, listing.postal_code, listing.country]
    .filter(Boolean)
    .join(', ');
  const addressLines = wrapText(fullAddress, reg, 9, CONTENT_W - 20);
  let y = cur.y - 28;
  for (const line of addressLines.slice(0, 2)) {
    cur.page.drawText(line, {
      x: MARGIN_X + 10,
      y,
      font: reg,
      size: 9,
      color: TEXT_BLACK,
    });
    y -= 11;
  }

  cur.page.drawText(`${listing.size_sqft.toLocaleString()} sq ft`, {
    x: PAGE_W - MARGIN_X - 120,
    y: cur.y - 14,
    font: italic,
    size: 8.5,
    color: MID_GREY,
  });

  cur.move(58);
  drawRule(cur.page, MARGIN_X, cur.y + 4, CONTENT_W);
  cur.move(12);
}

function renderSection(
  cur: Cursor,
  section: {
    key: string;
    title: string;
    summary?: string;
    items?: Array<{ label: string; value: string }>;
    freeform?: boolean;
    content?: string;
  },
  bold: PDFFont,
  reg: PDFFont,
  italic: PDFFont,
) {
  const labelCol = 160;
  const valueCol = CONTENT_W - labelCol - 4;
  const rowPad = 5;
  const lineH = 12;

  cur.ensureSpace(38);
  const titleY = cur.y;
  drawRect(cur.page, MARGIN_X, titleY - 22, CONTENT_W, 26, BRAND_NAVY);
  cur.page.drawText(section.title.toUpperCase(), {
    x: MARGIN_X + 10,
    y: titleY - 15,
    font: bold,
    size: 9,
    color: WHITE,
  });
  cur.move(30);

  if (section.summary) {
    const summaryLines = wrapText(section.summary, italic, 8.5, CONTENT_W - 20);
    cur.ensureSpace(summaryLines.length * 11 + 10);
    for (const line of summaryLines) {
      cur.page.drawText(line, {
        x: MARGIN_X + 10,
        y: cur.y,
        font: italic,
        size: 8.5,
        color: MID_GREY,
      });
      cur.move(11);
    }
    cur.move(4);
  }

  if (section.freeform) {
    const noteText = section.content?.trim() || '(None)';
    const noteLines = wrapText(noteText, reg, 9, CONTENT_W - 20);
    cur.ensureSpace(noteLines.length * lineH + rowPad * 2 + 4);

    const blockY = cur.y;
    drawRect(cur.page, MARGIN_X, blockY - (noteLines.length * lineH + rowPad * 2), CONTENT_W, noteLines.length * lineH + rowPad * 2, LIGHT_GREY);
    cur.move(rowPad + 2);

    for (const line of noteLines) {
      cur.page.drawText(line, {
        x: MARGIN_X + 10,
        y: cur.y,
        font: reg,
        size: 9,
        color: TEXT_BLACK,
      });
      cur.move(lineH);
    }

    cur.move(rowPad + 6);
    drawRule(cur.page, MARGIN_X, cur.y + 4, CONTENT_W);
    cur.move(8);
    return;
  }

  const items = section.items ?? [];
  if (items.length === 0) {
    cur.ensureSpace(18);
    cur.page.drawText('(No items specified)', {
      x: MARGIN_X + 10,
      y: cur.y,
      font: italic,
      size: 8.5,
      color: MID_GREY,
    });
    cur.move(18);
  } else {
    for (let i = 0; i < items.length; i++) {
      const { label, value } = items[i];
      const valueLines = wrapText(value || '-', reg, 9, valueCol);
      const rowH = valueLines.length * lineH + rowPad * 2;

      cur.ensureSpace(rowH + 2);
      const rowY = cur.y;
      const bg = i % 2 === 0 ? LIGHT_GREY : WHITE;
      drawRect(cur.page, MARGIN_X, rowY - rowH, CONTENT_W, rowH, bg);

      cur.page.drawText(label, {
        x: MARGIN_X + 10,
        y: rowY - rowPad - lineH + 3,
        font: bold,
        size: 8.5,
        color: BRAND_NAVY,
      });

      let lineY = rowY - rowPad - lineH + 3;
      for (const line of valueLines) {
        cur.page.drawText(line, {
          x: MARGIN_X + labelCol,
          y: lineY,
          font: reg,
          size: 9,
          color: TEXT_BLACK,
        });
        lineY -= lineH;
      }

      cur.move(rowH);
    }
  }

  drawRule(cur.page, MARGIN_X, cur.y + 2, CONTENT_W);
  cur.move(12);
}

function renderSignatureBlock(
  cur: Cursor,
  agreement: StorageAgreement,
  host: User,
  renter: User,
  bold: PDFFont,
  reg: PDFFont,
  italic: PDFFont,
) {
  cur.ensureSpace(130);

  const titleY = cur.y;
  drawRect(cur.page, MARGIN_X, titleY - 22, CONTENT_W, 26, BRAND_NAVY);
  cur.page.drawText('SIGNATURES', {
    x: MARGIN_X + 10,
    y: titleY - 15,
    font: bold,
    size: 9,
    color: WHITE,
  });
  cur.move(32);

  const sigW = (CONTENT_W - 14) / 2;
  const sigH = 82;
  const sigPad = 10;

  const parties: Array<{ label: string; name: string; signedAt: string | null | undefined }> = [
    { label: 'Host', name: host.full_name, signedAt: agreement.host_accepted_at },
    { label: 'Renter', name: renter.full_name, signedAt: agreement.renter_accepted_at },
  ];

  parties.forEach(({ label, name, signedAt }, i) => {
    const bx = MARGIN_X + i * (sigW + 14);
    const by = cur.y;

    drawRect(cur.page, bx, by - sigH, sigW, sigH, LIGHT_GREY);
    cur.page.drawText(label.toUpperCase(), {
      x: bx + sigPad,
      y: by - 16,
      font: bold,
      size: 7.5,
      color: BRAND_BLUE,
    });
    cur.page.drawText(name, {
      x: bx + sigPad,
      y: by - 30,
      font: bold,
      size: 10,
      color: TEXT_BLACK,
    });

    if (signedAt) {
      cur.page.drawText('Digitally agreed via WareShare', {
        x: bx + sigPad,
        y: by - 48,
        font: reg,
        size: 8.5,
        color: rgb(0.13, 0.55, 0.33),
      });
      cur.page.drawText(`Date: ${fmtDate(signedAt)}`, {
        x: bx + sigPad,
        y: by - 63,
        font: italic,
        size: 8,
        color: MID_GREY,
      });
    } else {
      drawRule(cur.page, bx + sigPad, by - 52, sigW - sigPad * 2, 1);
      cur.page.drawText('Signature', {
        x: bx + sigPad,
        y: by - 63,
        font: italic,
        size: 7.5,
        color: MID_GREY,
      });
      cur.page.drawText('Date: _______________', {
        x: bx + sigPad,
        y: by - 75,
        font: reg,
        size: 8,
        color: MID_GREY,
      });
    }
  });

  cur.move(sigH + 12);
  cur.page.drawText(
    'By accepting this agreement on the WareShare platform, each party acknowledges having read, understood, and agreed to all terms herein.',
    {
      x: MARGIN_X,
      y: cur.y,
      font: italic,
      size: 7.5,
      color: MID_GREY,
      maxWidth: CONTENT_W,
    },
  );
  cur.move(14);
}
