import * as fs from "fs";
import * as path from "path";
import { generateVoucherPDFBuffer } from "../lib/pdf/voucher-pdf";

async function main() {
  console.log("Generating voucher-preview.pdf ...");

  const buffer = await generateVoucherPDFBuffer({
    code: "FLYH-X4K9-2026",
    duration_minutes: 60,
    product_title: "Vol Exploration · 1 heure",
    expiresAt: new Date("2027-05-24"),
  });

  const outPath = path.join(__dirname, "..", "voucher-preview.pdf");
  fs.writeFileSync(outPath, buffer);
  console.log("✓ voucher-preview.pdf —", outPath);
}

main().catch(console.error);
