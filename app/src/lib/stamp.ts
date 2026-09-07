import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Stamps every page with the licensee's name and email. This is the
 *  practical deterrent against sharing: a copy carries its owner's name. */
export async function stampPdf(bytes: Uint8Array, licensee: { name: string; email: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const who = licensee.name ? `${licensee.name} (${licensee.email})` : licensee.email;
  const line = `Licensed to ${who} · Money Is a Tool · moneyisatool.ca · Not for redistribution`;
  const size = 7.5;
  const width = font.widthOfTextAtSize(line, size);

  for (const page of pdf.getPages()) {
    const { width: pw } = page.getSize();
    page.drawText(line, {
      x: Math.max(18, (pw - width) / 2),
      y: 14,
      size,
      font,
      color: rgb(0.45, 0.5, 0.46),
      opacity: 0.9,
    });
  }
  return pdf.save({ useObjectStreams: true });
}
