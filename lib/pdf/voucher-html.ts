export interface VoucherHtmlParams {
  code: string;
  duration_minutes: number;
  product_title: string;
  expiresAtStr: string;
  qrDataUrl: string;
  heroImageDataUrl: string;
}

function formatBadge(minutes: number): string {
  if (minutes < 60) return `${minutes} min de vol`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h de vol` : `${h}h${String(m).padStart(2, "0")} de vol`;
}

const ICON_LOCATION = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#F6C000"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
const ICON_CALENDAR = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F6C000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const ICON_SHIRT    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F6C000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>`;
const ICON_CLOUD    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F6C000" stroke-width="2" stroke-linecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`;

export function buildVoucherHtml(p: VoucherHtmlParams): string {
  const badge = formatBadge(p.duration_minutes);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 0; }

  html, body {
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    display: flex;
    flex-direction: column;
    background: #fff;
  }

  /* ── Hero ────────────────────────────────────────────────────────────── */
  .hero {
    position: relative;
    height: 100mm;
    flex-shrink: 0;
    overflow: hidden;
  }
  .hero-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 40%;
    display: block;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(6,37,72,0.45) 0%,
      rgba(6,37,72,0.15) 35%,
      rgba(6,37,72,0.55) 65%,
      rgba(6,37,72,0.92) 100%
    );
  }
  .hero-logo {
    position: absolute;
    top: 20px;
    left: 28px;
    height: 28px;
    width: auto;
    filter: brightness(0) invert(1);
    opacity: 0.95;
  }
  .hero-content {
    position: absolute;
    bottom: 26px;
    left: 28px;
    right: 28px;
  }
  .hero-badge {
    display: inline-block;
    background: #F6C000;
    color: #062548;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 2px;
    padding: 4px 14px;
    border-radius: 20px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .hero-title {
    color: #fff;
    font-size: 30px;
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }
  .hero-sub {
    color: rgba(255,255,255,0.75);
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.4px;
    margin-bottom: 4px;
  }
  .hero-tagline {
    color: rgba(255,255,255,0.5);
    font-size: 9px;
    font-weight: 300;
    font-style: italic;
  }

  /* ── Gold bar ────────────────────────────────────────────────────────── */
  .gold-bar { background: #F6C000; height: 3px; flex-shrink: 0; }

  /* ── Body ────────────────────────────────────────────────────────────── */
  .body {
    flex: 1;
    padding: 28px 32px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Boarding pass */
  .ticket {
    display: flex;
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(6,37,72,0.10);
  }
  .ticket-left {
    background: #062548;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 38%;
    flex-shrink: 0;
  }
  .ticket-tag {
    font-size: 7px;
    font-weight: 800;
    color: #F6C000;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .ticket-title {
    font-size: 15px;
    font-weight: 900;
    color: #fff;
    line-height: 1.2;
    letter-spacing: -0.3px;
  }
  .ticket-meta {
    font-size: 8px;
    color: rgba(255,255,255,0.45);
    font-weight: 400;
    margin-top: 4px;
  }
  .ticket-sep {
    width: 14px;
    flex-shrink: 0;
    background: #f1f5f9;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ticket-sep::before,
  .ticket-sep::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    border: 1.5px solid #e2e8f0;
    left: -2px;
  }
  .ticket-sep::before { top: -9px; }
  .ticket-sep::after  { bottom: -9px; }
  .ticket-sep-line {
    height: 100%;
    width: 100%;
    background: repeating-linear-gradient(
      to bottom,
      #cbd5e1 0, #cbd5e1 5px,
      transparent 5px, transparent 10px
    );
  }
  .ticket-right {
    flex: 1;
    background: #fff;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 6px;
  }
  .ticket-code-label {
    font-size: 7px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }
  .ticket-code {
    font-size: 24px;
    font-weight: 900;
    color: #062548;
    letter-spacing: 4px;
  }
  .ticket-validity {
    font-size: 8px;
    color: #94a3b8;
    font-weight: 400;
  }

  /* Reservation */
  .reservation {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    padding: 20px 24px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #f1f5f9;
  }
  .col-qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
  }
  .qr-wrap {
    border: 2px solid #062548;
    padding: 5px;
    border-radius: 6px;
    background: #fff;
  }
  .qr-wrap img { display: block; width: 95px; height: 95px; }
  .qr-url  { font-size: 7.5px; font-weight: 700; color: #062548; text-align: center; }
  .qr-hint { font-size: 7px; color: #94a3b8; text-align: center; line-height: 1.4; }

  .col-steps { flex: 1; padding-top: 2px; }
  .steps-label {
    font-size: 7.5px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .steps { display: flex; flex-direction: column; gap: 12px; }
  .step { display: flex; align-items: flex-start; gap: 11px; }
  .step-num {
    background: #F6C000;
    color: #062548;
    font-size: 8.5px;
    font-weight: 800;
    min-width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .step-body {}
  .step-title { font-size: 9px; font-weight: 600; color: #062548; margin-bottom: 2px; }
  .step-desc  { font-size: 8.5px; color: #64748b; line-height: 1.5; }
  .step-desc strong { color: #062548; font-weight: 600; }

  /* Info cards */
  .info-cards { display: flex; gap: 10px; }
  .info-card {
    flex: 1;
    padding: 14px 12px;
    border: 1px solid #f1f5f9;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .info-card-icon {
    width: 28px;
    height: 28px;
    background: #fffbeb;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .info-card-title {
    font-size: 8px;
    font-weight: 700;
    color: #062548;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .info-card-text {
    font-size: 8px;
    color: #64748b;
    line-height: 1.55;
  }

  /* FAQ */
  .faq { padding: 0; }
  .faq-eyebrow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .faq-eyebrow-line { flex: 1; height: 1px; background: #e2e8f0; }
  .faq-eyebrow-text {
    font-size: 8px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .faq-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .faq-item {
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 7px;
    border: 1px solid #f1f5f9;
  }
  .faq-q {
    font-size: 7.5px;
    font-weight: 700;
    color: #062548;
    margin-bottom: 4px;
  }
  .faq-a {
    font-size: 7.5px;
    color: #64748b;
    line-height: 1.55;
  }

  /* Footer */
  .footer {
    background: #062548;
    padding: 11px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .footer-brand { font-size: 8px; font-weight: 800; color: #F6C000; letter-spacing: 1.5px; }
  .footer-info  { font-size: 7.5px; color: #4e7096; }
</style>
</head>
<body>
<div class="page">

  <!-- Hero photo -->
  <div class="hero">
    <img src="${p.heroImageDataUrl}" class="hero-img" alt="Vol Fly Horizons">
    <div class="hero-overlay"></div>
    <img src="https://fly-horizons.com/logo-fly-horizons-navy.png" class="hero-logo" alt="Fly Horizons">
    <div class="hero-content">
      <div class="hero-badge">Voucher</div>
      <div class="hero-title">${p.product_title}</div>
      <div class="hero-sub">Volez où vous voulez. À votre façon.</div>
      <div class="hero-tagline">Baptême de l&rsquo;air en avion léger depuis l&rsquo;aéroport de Charleroi (EBCI).</div>
    </div>
  </div>

  <div class="gold-bar"></div>

  <!-- Body -->
  <div class="body">

    <!-- Code cadeau -->
    <div class="ticket-right" style="width:100%;border-radius:12px;box-shadow:0 2px 12px rgba(6,37,72,0.08);">
      <div class="ticket-code-label">Votre code</div>
      <div class="ticket-code">${p.code}</div>
      <div class="ticket-validity">À saisir lors de la réservation</div>
    </div>

    <!-- Réservation -->
    <div class="reservation">
      <div class="col-qr">
        <div class="qr-wrap">
          <img src="${p.qrDataUrl}" alt="QR code">
        </div>
        <div class="qr-url">fly-horizons.com</div>
        <div class="qr-hint">Scannez pour<br>réserver en ligne</div>
      </div>

      <div class="col-steps">
        <div class="steps-label">Comment réserver</div>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-body">
              <div class="step-title">Accédez au formulaire</div>
              <div class="step-desc">Scannez le QR code ou rendez-vous sur <strong>fly-horizons.com/reservation</strong>.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-body">
              <div class="step-title">Choisissez votre date</div>
              <div class="step-desc">Sélectionnez un créneau disponible et saisissez votre <strong>code cadeau</strong>.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-body">
              <div class="step-title">Confirmation sous 48h</div>
              <div class="step-desc">Votre pilote valide votre créneau et vous envoie votre <strong>itinéraire de vol</strong> par email avant le décollage.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Infos pratiques -->
    <div class="info-cards">
      <div class="info-card">
        <div class="info-card-icon">${ICON_LOCATION}</div>
        <div class="info-card-title">Lieu</div>
        <div class="info-card-text">Aéroport de Charleroi (EBCI)<br>Rue des Frères Wright 8<br>6041 Gosselies</div>
      </div>
      <div class="info-card">
        <div class="info-card-icon">${ICON_CALENDAR}</div>
        <div class="info-card-title">Avant le vol</div>
        <div class="info-card-text">Votre pilote confirme l&rsquo;heure exacte<br>et vous envoie votre itinéraire<br>quelques jours avant le départ.</div>
      </div>
      <div class="info-card">
        <div class="info-card-icon">${ICON_SHIRT}</div>
        <div class="info-card-title">Tenue</div>
        <div class="info-card-text">Vêtements confortables.<br>Prévoir une couche chaude,<br>même en été.</div>
      </div>
      <div class="info-card">
        <div class="info-card-icon">${ICON_CLOUD}</div>
        <div class="info-card-title">Météo</div>
        <div class="info-card-text">Vol par beau temps.<br>Reporté sans frais en cas<br>de conditions défavorables.</div>
      </div>
    </div>

    <!-- FAQ -->
    <div class="faq">
      <div class="faq-eyebrow">
        <div class="faq-eyebrow-line"></div>
        <div class="faq-eyebrow-text">Questions fréquentes</div>
        <div class="faq-eyebrow-line"></div>
      </div>
      <div class="faq-grid">
        <div class="faq-item">
          <div class="faq-q">Mauvaise météo : que se passe-t-il ?</div>
          <div class="faq-a">Le vol est reporté sans frais. La décision appartient au pilote. Vous êtes prévenu par email ou téléphone dès que possible.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Puis-je annuler ou reporter ?</div>
          <div class="faq-a">Annulation sans frais jusqu&rsquo;à 48h avant le vol. Pour reporter, connectez-vous à votre espace client sur fly-horizons.com.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Combien de passagers à bord ?</div>
          <div class="faq-a">L&rsquo;avion accueille le pilote et jusqu&rsquo;à 3 passagers. Si vous êtes plus de 3, plusieurs vols seront nécessaires.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Photos et vidéos pendant le vol ?</div>
          <div class="faq-a">Oui, sans restriction. Pensez à charger vos appareils avant le vol et à les sécuriser à bord.</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <span class="footer-brand">FLY HORIZONS</span>
    <span class="footer-info">info@fly-horizons.com</span>
    <span class="footer-info">fly-horizons.com</span>
  </div>

</div>
</body>
</html>`;
}
