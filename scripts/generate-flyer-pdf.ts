import * as fs from "fs";
import * as path from "path";
import QRCode from "qrcode";

const ROOT = path.join(__dirname, "..");

async function buildHtml(): Promise<string> {
  const heroPath = path.join(ROOT, "public", "gallery", "1.png");
  const logoPath = path.join(ROOT, "public", "fly-horizons-logo-white.svg");

  const heroBuf = fs.readFileSync(heroPath);
  const heroB64 = "data:image/png;base64," + heroBuf.toString("base64");

  const logoSvg = fs.readFileSync(logoPath, "utf-8");
  const logoB64 = "data:image/svg+xml;base64," + Buffer.from(logoSvg).toString("base64");

  const qrUrl = "https://fly-horizons.com/reservation";
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#062548", light: "#ffffff" },
  });

  return /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,600;0,700;0,900;1,300&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      background: #000;
    }

    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      font-family: 'Inter', 'Helvetica Neue', Helvetica, sans-serif;
    }

    /* ── Photo pleine page ────────────────────── */
    .bg-photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 40%;
    }

    /* Dégradé : transparent en haut, très sombre en bas */
    .overlay {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to bottom,
          rgba(3,18,40,0.42) 0%,
          rgba(3,18,40,0.10) 28%,
          rgba(3,18,40,0.08) 42%,
          rgba(3,18,40,0.72) 62%,
          rgba(3,18,40,0.97) 80%,
          rgba(3,18,40,1.00) 100%
        );
    }

    /* ── Contenu ──────────────────────────────── */
    .content {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      padding: 9mm 12mm 10mm;
    }

    /* Logo */
    .logo {
      height: 6.5mm;
      width: auto;
      object-fit: contain;
      object-position: left;
    }

    /* Pousse le bloc principal vers le bas */
    .spacer { flex: 1; }

    /* ── Bloc principal (bottom) ──────────────── */
    .main {
      display: flex;
      flex-direction: column;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      background: #F6C000;
      color: #031228;
      font-size: 6.5pt;
      font-weight: 700;
      letter-spacing: 2.5px;
      padding: 3px 12px 3px 10px;
      border-radius: 20px;
      margin-bottom: 4.5mm;
      align-self: flex-start;
      text-transform: uppercase;
    }

    .headline {
      color: #ffffff;
      font-size: 52pt;
      font-weight: 900;
      line-height: 0.92;
      letter-spacing: -2px;
      margin-bottom: 5mm;
    }
    .headline .accent {
      color: #F6C000;
    }

    .tagline {
      color: rgba(255,255,255,0.65);
      font-size: 10pt;
      font-weight: 300;
      font-style: italic;
      line-height: 1.55;
      margin-bottom: 8mm;
      max-width: 130mm;
    }

    /* Ligne de séparation fine */
    .divider {
      width: 100%;
      height: 1px;
      background: rgba(255,255,255,0.10);
      margin-bottom: 7mm;
    }

    /* ── Rangée basse : infos + QR ────────────── */
    .bottom-row {
      display: flex;
      align-items: flex-end;
      gap: 0;
    }

    /* Infos gauche */
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 3.5mm;
    }

    .bullet {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #F6C000;
      flex-shrink: 0;
      margin-top: 3.5px;
    }

    .info-text {
      font-size: 8.5pt;
      color: rgba(255,255,255,0.60);
      line-height: 1.45;
    }
    .info-text b {
      color: rgba(255,255,255,0.90);
      font-weight: 600;
    }

    /* QR droite */
    .qr-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5mm;
      padding-left: 10mm;
    }

    .qr-frame {
      border: 1.5px solid rgba(255,255,255,0.20);
      border-radius: 10px;
      padding: 3mm;
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(4px);
    }

    .qr-frame img {
      display: block;
      width: 30mm;
      height: 30mm;
      border-radius: 4px;
    }

    .qr-label {
      text-align: center;
    }
    .qr-label .url {
      display: block;
      font-size: 7.5pt;
      font-weight: 700;
      color: rgba(255,255,255,0.85);
      letter-spacing: 0.2px;
      margin-bottom: 1px;
    }
    .qr-label .hint {
      font-size: 6.5pt;
      color: rgba(255,255,255,0.35);
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Photo pleine page -->
  <img class="bg-photo" src="${heroB64}" alt="" />
  <div class="overlay"></div>

  <!-- Contenu -->
  <div class="content">
    <img class="logo" src="${logoB64}" alt="Fly Horizons" />

    <div class="spacer"></div>

    <div class="main">
      <span class="badge">Baptême de l'air · Avion léger</span>

      <div class="headline">
        Et si vous<br>regardiez la<br>Belgique <span class="accent">d'en haut&nbsp;?</span>
      </div>

      <div class="tagline">
        Volez avec votre pilote depuis Charleroi. Ardennes, Bruxelles, côte&nbsp;—<br>vous choisissez le paysage, on s'occupe du reste.
      </div>

      <div class="divider"></div>

      <div class="bottom-row">
        <div class="info">
          <div class="info-item">
            <div class="bullet"></div>
            <div class="info-text"><b>Pilote certifié</b> — accompagnement complet, sécurité garantie</div>
          </div>
          <div class="info-item">
            <div class="bullet"></div>
            <div class="info-text"><b>Itinéraire sur mesure</b> — vous décidez où vous allez</div>
          </div>
          <div class="info-item">
            <div class="bullet"></div>
            <div class="info-text"><b>Aéroport de Charleroi (EBCI)</b> · Gosselies · info@fly-horizons.com</div>
          </div>
        </div>

        <div class="qr-block">
          <div class="qr-frame">
            <img src="${qrDataUrl}" alt="QR code" />
          </div>
          <div class="qr-label">
            <span class="url">fly-horizons.com</span>
            <span class="hint">Scannez pour réserver</span>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>
</body>
</html>`;
}

async function main() {
  console.log("Generating flyer.pdf ...");

  const { chromium } = await import("playwright");
  const html = await buildHtml();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();

  const outPath = path.join(ROOT, "flyer.pdf");
  fs.writeFileSync(outPath, pdfBuffer);
  console.log("✓ flyer.pdf —", outPath);
}

main().catch(console.error);
