"use client";

import { buildEnvelopeGeometry } from "@/lib/mass-balance/envelope-geometry";
import type { MbPoint } from "@/lib/mass-balance/da40-calc";

export function CgEnvelopeChart({ points }: { points: MbPoint[] }) {
  const g = buildEnvelopeGeometry(points);
  const { colors: c } = g;

  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      role="img"
      aria-label="Enveloppe de centrage DA40"
      className="w-full h-auto block"
    >
      {/* grille verticale (CG) */}
      {g.gridX.map((gx, i) => (
        <g key={`x${i}`}>
          <line x1={gx.x} y1={g.gridTop} x2={gx.x} y2={g.gridBottom} stroke={c.grid} />
          <text x={gx.x} y={g.gridBottom + 18} textAnchor="middle" fontSize={12} fill={c.muted}>
            {gx.label}
          </text>
        </g>
      ))}
      {/* grille horizontale (masse) */}
      {g.gridY.map((gy, i) => (
        <g key={`y${i}`}>
          <line x1={g.gridLeft} y1={gy.y} x2={g.gridRight} y2={gy.y} stroke={c.grid} />
          <text x={g.gridLeft - 8} y={gy.y + 4} textAnchor="end" fontSize={12} fill={c.muted}>
            {gy.label}
          </text>
        </g>
      ))}

      {/* axes */}
      <text x={g.axisX.x} y={g.axisX.y} textAnchor="middle" fontSize={12} fill={c.ink}>
        {g.axisX.text}
      </text>
      <text transform={g.axisYTransform} textAnchor="middle" fontSize={12} fill={c.ink}>
        Masse (kg)
      </text>

      {/* enveloppe Normal */}
      <polygon points={g.envelopePoints} fill={c.fill} stroke={c.navy} strokeWidth={2} />
      {/* limite Utility */}
      <line
        x1={g.utilityLine.x1}
        y1={g.utilityLine.y1}
        x2={g.utilityLine.x2}
        y2={g.utilityLine.y2}
        stroke={c.navy}
        strokeWidth={1.5}
      />
      {g.staticLabels.map((l, i) => (
        <text key={`l${i}`} x={l.x} y={l.y} textAnchor="middle" fontSize={l.size} fill={i < 2 ? c.navy : c.muted}>
          {l.text}
        </text>
      ))}

      {/* trajectoire */}
      <polyline
        points={g.trajectory}
        fill="none"
        stroke={c.muted}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {/* points */}
      {g.markers.map((m, i) => (
        <g key={`m${i}`}>
          {m.type === "circle" && <circle cx={m.x} cy={m.y} r={6} fill={m.color} />}
          {m.type === "square" && (
            <rect x={m.x - 5.5} y={m.y - 5.5} width={11} height={11} fill={m.color} />
          )}
          {m.type === "triangle" && (
            <polygon
              points={`${m.x},${m.y - 7} ${m.x - 6.5},${m.y + 5} ${m.x + 6.5},${m.y + 5}`}
              fill={m.color}
            />
          )}
          <text x={m.x + 10} y={m.y + 4} fontSize={12} fill={m.color} fontWeight={600}>
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
