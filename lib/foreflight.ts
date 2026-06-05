export function toForeFlight(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  const latStr = Math.abs(lat).toFixed(4).padStart(7, "0");
  const lngStr = Math.abs(lng).toFixed(4).padStart(8, "0");
  return `${latStr}${latDir} ${lngStr}${lngDir}`;
}

export function buildForeFlightRoute(
  waypoints: Array<{ lat: number; lng: number; nom?: string }>,
  stopovers?: Array<{ icao: string }>
): string {
  const parts: string[] = ["EBCI"];
  for (const wp of waypoints) parts.push(toForeFlight(wp.lat, wp.lng));
  if (stopovers) for (const so of stopovers) parts.push(so.icao);
  parts.push("EBCI");
  return parts.join(" ");
}
