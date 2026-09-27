import { Badge } from "./badge";

// Fonctionnalité pas encore construite (repris de Nexus, 27/09) : un petit
// chantier animé (grue qui déplace sa charge, gyrophare, briques qu'on pose)
// et ce qui arrive. L'animation s'arrête avec « réduire les animations ».
export function UnderConstruction({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-st-line bg-white px-6 py-10 text-center shadow-st-sm">
      <ConstructionSite />
      <Badge tone="warning" dot className="mt-5">En construction</Badge>
      <p className="mt-3 text-base font-semibold tracking-tight text-st-text">{title}</p>
      <div className="mt-1.5 max-w-md text-sm leading-relaxed text-st-text-2">{children}</div>
    </div>
  );
}

const ORANGE = "#f08a24";

function ConstructionSite() {
  return (
    <svg viewBox="0 0 220 120" className="h-auto w-full max-w-[300px]" aria-hidden="true">
      <defs>
        <pattern id="st-barrier-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill={ORANGE} />
          <rect x="6" width="6" height="12" fill="#fff" />
        </pattern>
      </defs>

      {/* Sol */}
      <line x1="8" y1="108" x2="212" y2="108" strokeWidth="2" strokeLinecap="round" className="stroke-st-line-strong" />

      {/* Grue : mât en treillis, flèche, contrepoids, cabine */}
      <g className="stroke-st-text-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M44 108 V26 M54 108 V26" />
        <path d="M44 100 L54 88 L44 76 L54 64 L44 52 L54 40 L44 28" strokeWidth="1.2" />
        <path d="M22 24 H170" />
        <path d="M49 10 L22 24 M49 10 L170 24 M49 10 V24" strokeWidth="1.2" />
      </g>
      <rect x="20" y="25" width="16" height="10" rx="2" className="fill-st-text-2" />
      <rect x="55" y="26" width="10" height="9" rx="2" className="fill-st-gold" />

      {/* Chariot, câble et charge qui se balance */}
      <g className="st-crane-trolley">
        <rect x="118" y="22" width="12" height="5" rx="1.5" className="fill-st-text" />
        <g className="st-crane-swing" style={{ transformOrigin: "124px 27px" }}>
          <line x1="124" y1="27" x2="124" y2="60" strokeWidth="1.2" className="stroke-st-text-2" />
          <path d="M121 60 h6 l-3 4 z" className="fill-st-text-2" />
          <rect x="110" y="64" width="28" height="14" rx="2.5" className="fill-st-ink" />
          <path d="M110 71 H138 M119 64 V71 M129 71 V78" strokeWidth="1" stroke="rgba(255,255,255,.55)" />
        </g>
      </g>

      {/* Mur en construction : la brique du haut se pose sans fin */}
      <g>
        <rect x="80" y="98" width="18" height="10" rx="1.5" fill="#f7dc85" />
        <rect x="99" y="98" width="18" height="10" rx="1.5" fill="#f7dc85" />
        <rect x="89" y="87" width="18" height="10" rx="1.5" fill="#f7dc85" />
        <rect x="108" y="87" width="18" height="10" rx="1.5" className="st-brick-drop fill-st-gold" />
      </g>

      {/* Barrière et son gyrophare */}
      <g>
        <circle cx="178" cy="75" r="9" className="st-beacon" fill={ORANGE} fillOpacity={0.25} />
        <circle cx="178" cy="75" r="4" className="st-beacon" fill={ORANGE} />
        <rect x="176" y="79" width="4" height="5" className="fill-st-text-2" />
        <rect x="150" y="84" width="56" height="10" rx="2" fill="url(#st-barrier-stripes)" />
        <rect x="150" y="84" width="56" height="10" rx="2" fill="none" strokeWidth="1" stroke={ORANGE} />
        <path d="M156 94 V108 M200 94 V108" strokeWidth="3" strokeLinecap="round" className="stroke-st-text-2" />
      </g>

      {/* Cône */}
      <g>
        <path d="M66 108 L72 88 L78 108 Z" fill={ORANGE} />
        <path d="M69.3 98 H74.7" strokeWidth="2.4" stroke="#fff" />
        <rect x="63" y="106" width="18" height="3" rx="1" fill={ORANGE} />
      </g>
    </svg>
  );
}
