import * as fs from "fs";
import * as path from "path";
import QRCode from "qrcode";
import { buildVoucherHtml } from "./voucher-html";

export interface VoucherPDFParams {
  code: string;
  duration_minutes: number;
  product_title: string;
  expiresAt: Date;
}

export async function generateVoucherPDFBuffer(params: VoucherPDFParams): Promise<Buffer> {
  const { chromium } = await import("playwright");

  const reservationUrl = `https://fly-horizons.com/reservation?duree=${params.duration_minutes}&code=${encodeURIComponent(params.code)}`;

  const qrDataUrl = await QRCode.toDataURL(reservationUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#062548", light: "#ffffff" },
  });

  const expiresAtStr = params.expiresAt.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const imgBuffer = fs.readFileSync(path.join(process.cwd(), "public", "gallery", "2.png"));
  const heroImageDataUrl = "data:image/png;base64," + imgBuffer.toString("base64");

  const html = buildVoucherHtml({
    code: params.code,
    duration_minutes: params.duration_minutes,
    product_title: params.product_title,
    expiresAtStr,
    qrDataUrl,
    heroImageDataUrl,
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();

  return Buffer.from(pdf);
}
